-- Treat minimum advance booking days as exact elapsed 24-hour periods.
-- This keeps renter discovery and database booking enforcement aligned with
-- the super-admin policy preview.

CREATE OR REPLACE FUNCTION public.check_booking_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  policy_min_days INTEGER := 0;
  policy_min_lead_hours INTEGER := 0;
  policy_min_notice_hours INTEGER := 0;
  now_pt TIMESTAMP;
BEGIN
  IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE venue_id = NEW.venue_id
      AND date = NEW.date
      AND status IN ('confirmed', 'pending')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (NEW.start_time < end_time AND NEW.end_time > start_time)
  ) THEN
      RAISE EXCEPTION 'Booking time conflicts with existing booking';
  END IF;

  IF EXISTS (
      SELECT 1 FROM public.recurring_bookings
      WHERE venue_id = NEW.venue_id
      AND date = NEW.date
      AND status IN ('confirmed', 'pending')
      AND (NEW.start_time < end_time AND NEW.end_time > start_time)
  ) THEN
      RAISE EXCEPTION 'Booking time conflicts with existing recurring booking';
  END IF;

  IF NOT EXISTS (
      SELECT 1 FROM public.availability
      WHERE venue_id = NEW.venue_id
      AND date = NEW.date
      AND start_time <= NEW.start_time
      AND end_time >= NEW.end_time
      AND is_available = true
  ) THEN
      RAISE EXCEPTION 'Requested time slot is not available';
  END IF;

  SELECT
    COALESCE(vac.min_advance_booking_days, 0),
    COALESCE(vac.min_advance_lead_time_hours, 0)
  INTO
    policy_min_days,
    policy_min_lead_hours
  FROM public.venues v
  LEFT JOIN public.venue_admin_configs vac ON vac.venue_id = v.id
  WHERE v.id = NEW.venue_id;

  now_pt := timezone('America/Los_Angeles', now());
  policy_min_notice_hours := policy_min_days * 24 + policy_min_lead_hours;

  IF policy_min_notice_hours > 0
    AND (NEW.date + NEW.start_time) < (now_pt + make_interval(hours => policy_min_notice_hours))
  THEN
    IF policy_min_days > 0 THEN
      RAISE EXCEPTION 'Booking does not meet minimum advance booking period';
    END IF;

    RAISE EXCEPTION 'Booking does not meet minimum lead time';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_regular_available_slot_instances(
  p_venue_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_date_filter DATE DEFAULT NULL
)
RETURNS TABLE (
  venue_id UUID,
  slot_id UUID,
  slot_date DATE,
  start_time TIME,
  end_time TIME,
  action_type public.slot_action_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH now_pt AS (
    SELECT timezone('America/Los_Angeles', now()) AS ts
  ),
  base_regular_slots AS (
    SELECT
      si.venue_id,
      si.id AS slot_id,
      si.date AS slot_date,
      si.start_time,
      si.end_time,
      si.action_type,
      COALESCE(vac.drop_in_enabled, false) AS drop_in_enabled
    FROM public.slot_instances si
    LEFT JOIN public.venue_admin_configs vac ON vac.venue_id = si.venue_id
    CROSS JOIN now_pt
    WHERE si.is_active = true
      AND si.action_type IN ('instant_book', 'request_private')
      AND (p_venue_id IS NULL OR si.venue_id = p_venue_id)
      AND (
        (p_date_filter IS NOT NULL AND si.date = p_date_filter)
        OR (
          p_date_filter IS NULL
          AND p_date_from IS NOT NULL
          AND p_date_to IS NOT NULL
          AND si.date BETWEEN p_date_from AND p_date_to
        )
        OR (
          p_date_filter IS NULL
          AND p_date_from IS NOT NULL
          AND p_date_to IS NULL
          AND si.date >= p_date_from
        )
        OR (
          p_date_filter IS NULL
          AND p_date_from IS NULL
          AND p_date_to IS NOT NULL
          AND si.date <= p_date_to
        )
        OR (
          p_date_filter IS NULL
          AND p_date_from IS NULL
          AND p_date_to IS NULL
        )
      )
      AND (si.date + si.start_time) >= (
        now_pt.ts + make_interval(hours => (
          COALESCE(vac.min_advance_booking_days, 0) * 24
          + COALESCE(vac.min_advance_lead_time_hours, 0)
        ))
      )
      AND NOT (
        si.date = ANY(COALESCE(vac.blackout_dates, '{}'::date[]))
      )
      AND NOT (
        si.date = ANY(COALESCE(vac.holiday_dates, '{}'::date[]))
      )
  )
  SELECT
    rs.venue_id,
    rs.slot_id,
    rs.slot_date,
    rs.start_time,
    rs.end_time,
    rs.action_type
  FROM base_regular_slots rs
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.external_availability_blocks eab
    WHERE eab.venue_id = rs.venue_id
      AND eab.status = 'active'
      AND tstzrange(eab.start_at, eab.end_at, '[)') && tstzrange(
        (rs.slot_date + rs.start_time) AT TIME ZONE 'America/Los_Angeles',
        (rs.slot_date + rs.end_time) AT TIME ZONE 'America/Los_Angeles',
        '[)'
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.venue_id = rs.venue_id
      AND b.date = rs.slot_date
      AND b.status IN ('pending', 'confirmed')
      AND rs.start_time < b.end_time
      AND rs.end_time > b.start_time
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.recurring_bookings rb
    WHERE rb.venue_id = rs.venue_id
      AND rb.date = rs.slot_date
      AND rb.status IN ('pending', 'confirmed')
      AND rs.start_time < rb.end_time
      AND rs.end_time > rb.start_time
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.slot_instances di
    WHERE rs.drop_in_enabled = true
      AND di.venue_id = rs.venue_id
      AND di.is_active = true
      AND di.action_type = 'info_only_open_gym'
      AND di.blocks_inventory = true
      AND di.date = rs.slot_date
      AND rs.start_time < di.end_time
      AND rs.end_time > di.start_time
  )
  ORDER BY rs.venue_id, rs.slot_date, rs.start_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_regular_available_slot_instances TO authenticated, anon;

COMMENT ON FUNCTION public.get_regular_available_slot_instances IS
  'Canonical regular slot eligibility (policy, blackout/holiday, external blocks, booking occupancy, and drop-in inventory blocking). Minimum advance booking days are exact elapsed 24-hour periods.';

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
    next_slot_end_time TIME
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH next_slots AS (
      SELECT DISTINCT ON (s.venue_id)
        s.venue_id,
        s.slot_id,
        s.slot_date,
        s.start_time,
        s.end_time
      FROM public.get_regular_available_slot_instances(
        NULL::uuid,
        NULL::date,
        NULL::date,
        p_date_filter
      ) s
      ORDER BY s.venue_id, s.slot_date, s.start_time
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
      ns.end_time AS next_slot_end_time
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
      CASE
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
        THEN ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
        )
        ELSE NULL
      END NULLS LAST,
      v.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_venues_with_next_available TO authenticated, anon;

COMMENT ON FUNCTION public.get_venues_with_next_available IS
  'Returns active venues with their next regular slot_instance filtered through shared exact minimum-advance eligibility.';
