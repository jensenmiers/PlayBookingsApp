-- Expand next-available discovery to include future open-gym sessions.
-- Regular rental eligibility remains owned by get_regular_available_slot_instances.

CREATE INDEX IF NOT EXISTS idx_slot_instances_info_active_lookup
  ON public.slot_instances (venue_id, date, start_time, end_time)
  WHERE is_active = true
    AND action_type = 'info_only_open_gym';

DROP FUNCTION IF EXISTS public.get_venues_with_next_available(
  DATE,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION
);

CREATE OR REPLACE FUNCTION public.get_venues_with_next_available(
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
    WITH now_pt AS (
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
        sip.amount_cents AS price_amount_cents,
        sip.currency AS price_currency,
        sip.unit AS price_unit,
        sip.payment_method
      FROM public.get_regular_available_slot_instances(
        NULL::uuid,
        NULL::date,
        NULL::date,
        p_date_filter
      ) s
      LEFT JOIN public.slot_instance_pricing sip
        ON sip.slot_instance_id = s.slot_id
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
      WHERE si.is_active = true
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
    LEFT JOIN next_slots ns ON v.id = ns.venue_id
    WHERE v.is_active = true
      AND v.location IS NOT NULL
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

GRANT EXECUTE ON FUNCTION public.get_venues_with_next_available TO authenticated, anon;

COMMENT ON FUNCTION public.get_venues_with_next_available IS
  'Returns active venues with their earliest future regular rental or open-gym session, ordered chronologically with optional distance tie-breaking.';
