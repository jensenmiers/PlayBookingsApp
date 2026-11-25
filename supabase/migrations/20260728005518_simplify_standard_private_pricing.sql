-- Private rentals use venues.hourly_rate on every day.
-- Per-instance pricing remains available only for info-only open-gym sessions.

UPDATE public.slot_templates
SET pricing_rule_id = NULL
WHERE action_type IN ('instant_book', 'request_private')
  AND pricing_rule_id IS NOT NULL;

DELETE FROM public.slot_instance_pricing sip
USING public.slot_instances si
WHERE sip.slot_instance_id = si.id
  AND si.action_type IN ('instant_book', 'request_private');

DELETE FROM public.pricing_rules
WHERE action_type IN ('instant_book', 'request_private');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pricing_rules_open_gym_only'
      AND conrelid = 'public.pricing_rules'::regclass
  ) THEN
    ALTER TABLE public.pricing_rules
      ADD CONSTRAINT pricing_rules_open_gym_only
      CHECK (action_type = 'info_only_open_gym');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'slot_templates_open_gym_pricing_only'
      AND conrelid = 'public.slot_templates'::regclass
  ) THEN
    ALTER TABLE public.slot_templates
      ADD CONSTRAINT slot_templates_open_gym_pricing_only
      CHECK (
        pricing_rule_id IS NULL
        OR action_type = 'info_only_open_gym'
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.venues.hourly_rate IS
  'Standard hourly rate for private rentals on every day.';

COMMENT ON TABLE public.pricing_rules IS
  'Offering-specific pricing rules for info-only open-gym sessions; private rentals use venues.hourly_rate.';

COMMENT ON TABLE public.slot_instance_pricing IS
  'Per-instance open-gym pricing snapshots; private rentals use venues.hourly_rate.';

CREATE OR REPLACE FUNCTION public.get_venues_with_next_available(
    p_access_filter TEXT,
    p_date_filter DATE DEFAULT NULL,
    p_user_lat DOUBLE PRECISION DEFAULT NULL,
    p_user_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius_miles DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
    venue_id UUID,
    venue_name TEXT,
    venue_city TEXT,
    venue_state TEXT,
    venue_address TEXT,
    hourly_rate NUMERIC,
    instant_booking BOOLEAN,
    booking_mode TEXT,
    insurance_required BOOLEAN,
    offers_open_gym BOOLEAN,
    offers_private_rental BOOLEAN,
    drop_in_price NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    distance_miles DOUBLE PRECISION,
    next_slot_id UUID,
    next_slot_date DATE,
    next_slot_start_time TIME,
    next_slot_end_time TIME,
    next_slot_action_type public.slot_action_type,
    next_slot_price_amount_cents INTEGER,
    next_slot_price_currency TEXT,
    next_slot_price_unit public.pricing_unit,
    next_slot_payment_method public.payment_method_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH access_scope AS (
      SELECT CASE
        WHEN p_access_filter IN ('open_gym', 'private_rental') THEN p_access_filter
        ELSE 'all'
      END AS access_filter
    ),
    now_pt AS (
      SELECT timezone('America/Los_Angeles', now()) AS ts
    ),
    regular_candidates AS (
      SELECT
        s.venue_id,
        s.slot_id,
        s.slot_date,
        s.start_time,
        s.end_time,
        s.action_type,
        NULL::integer AS price_amount_cents,
        NULL::text AS price_currency,
        NULL::public.pricing_unit AS price_unit,
        NULL::public.payment_method_type AS payment_method
      FROM public.get_regular_available_slot_instances(
        NULL::uuid,
        NULL::date,
        NULL::date,
        p_date_filter
      ) s
      CROSS JOIN access_scope scope
      WHERE scope.access_filter IN ('all', 'private_rental')
    ),
    info_candidates AS (
      SELECT
        si.venue_id,
        si.id AS slot_id,
        si.date AS slot_date,
        si.start_time,
        si.end_time,
        si.action_type,
        COALESCE(
          sip.amount_cents,
          CASE
            WHEN vac.drop_in_price IS NOT NULL
            THEN round(vac.drop_in_price * 100)::integer
            ELSE NULL
          END
        ) AS price_amount_cents,
        CASE
          WHEN sip.amount_cents IS NOT NULL OR vac.drop_in_price IS NOT NULL
          THEN COALESCE(sip.currency, 'USD')
          ELSE NULL
        END AS price_currency,
        CASE
          WHEN sip.amount_cents IS NOT NULL OR vac.drop_in_price IS NOT NULL
          THEN COALESCE(sip.unit, 'person'::public.pricing_unit)
          ELSE NULL
        END AS price_unit,
        CASE
          WHEN sip.amount_cents IS NOT NULL OR vac.drop_in_price IS NOT NULL
          THEN COALESCE(sip.payment_method, 'on_site'::public.payment_method_type)
          ELSE NULL
        END AS payment_method
      FROM public.slot_instances si
      JOIN public.venue_admin_configs vac ON vac.venue_id = si.venue_id
      LEFT JOIN public.slot_instance_pricing sip ON sip.slot_instance_id = si.id
      CROSS JOIN now_pt
      CROSS JOIN access_scope scope
      WHERE scope.access_filter IN ('all', 'open_gym')
        AND si.is_active = true
        AND si.action_type = 'info_only_open_gym'
        AND COALESCE(vac.drop_in_enabled, false) = true
        AND (p_date_filter IS NULL OR si.date = p_date_filter)
        AND (si.date + si.start_time) >= now_pt.ts
        AND NOT (si.date = ANY(COALESCE(vac.blackout_dates, '{}'::date[])))
        AND NOT (si.date = ANY(COALESCE(vac.holiday_dates, '{}'::date[])))
        AND NOT EXISTS (
          SELECT 1
          FROM public.external_availability_blocks eab
          WHERE eab.venue_id = si.venue_id
            AND eab.status = 'active'
            AND tstzrange(eab.start_at, eab.end_at, '[)') && tstzrange(
              (si.date + si.start_time) AT TIME ZONE 'America/Los_Angeles',
              (si.date + si.end_time) AT TIME ZONE 'America/Los_Angeles',
              '[)'
            )
        )
    ),
    all_candidates AS (
      SELECT * FROM regular_candidates
      UNION ALL
      SELECT * FROM info_candidates
    ),
    next_slots AS (
      SELECT DISTINCT ON (c.venue_id)
        c.venue_id,
        c.slot_id,
        c.slot_date,
        c.start_time,
        c.end_time,
        c.action_type,
        c.price_amount_cents,
        c.price_currency,
        c.price_unit,
        c.payment_method
      FROM all_candidates c
      ORDER BY
        c.venue_id,
        c.slot_date,
        c.start_time,
        CASE WHEN c.action_type IN ('instant_book', 'request_private') THEN 0 ELSE 1 END,
        c.slot_id
    )
    SELECT
      v.id AS venue_id,
      v.name AS venue_name,
      v.city AS venue_city,
      v.state AS venue_state,
      v.address AS venue_address,
      v.hourly_rate,
      v.instant_booking,
      v.booking_mode,
      v.insurance_required,
      v.offers_open_gym,
      v.offers_private_rental,
      v.drop_in_price,
      v.latitude,
      v.longitude,
      CASE
        WHEN p_user_lat IS NOT NULL
             AND p_user_lng IS NOT NULL
             AND v.location IS NOT NULL
        THEN ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        ) / 1609.34
        ELSE NULL
      END AS distance_miles,
      ns.slot_id AS next_slot_id,
      ns.slot_date AS next_slot_date,
      ns.start_time AS next_slot_start_time,
      ns.end_time AS next_slot_end_time,
      ns.action_type AS next_slot_action_type,
      ns.price_amount_cents AS next_slot_price_amount_cents,
      ns.price_currency AS next_slot_price_currency,
      ns.price_unit AS next_slot_price_unit,
      ns.payment_method AS next_slot_payment_method
    FROM public.venues v
    CROSS JOIN access_scope scope
    LEFT JOIN next_slots ns ON v.id = ns.venue_id
    WHERE v.is_active = true
      AND v.location IS NOT NULL
      AND (
        scope.access_filter = 'all'
        OR (scope.access_filter = 'open_gym' AND v.offers_open_gym)
        OR (scope.access_filter = 'private_rental' AND v.offers_private_rental)
      )
      AND (
        p_radius_miles IS NULL
        OR p_user_lat IS NULL
        OR p_user_lng IS NULL
        OR ST_DWithin(
          v.location,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography,
          p_radius_miles * 1609.34
        )
      )
    ORDER BY
      ns.slot_date ASC NULLS LAST,
      ns.start_time ASC NULLS LAST,
      CASE
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
        THEN ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        )
        ELSE NULL
      END ASC NULLS LAST,
      v.name;
$$;

COMMENT ON FUNCTION public.get_venues_with_next_available(
  TEXT,
  DATE,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION
) IS
  'Returns active venues with earliest eligible slots; private rentals use venues.hourly_rate and open gym may expose instance pricing.';

ALTER TABLE public.venues
  DROP COLUMN weekend_rate;
