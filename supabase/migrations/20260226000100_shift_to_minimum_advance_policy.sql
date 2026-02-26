-- Shift booking policy model to minimum advance controls.
-- Removes same-day cutoff, introduces minimum advance booking days,
-- and updates policy-aware SQL functions.

ALTER TABLE public.venue_admin_configs
  ADD COLUMN IF NOT EXISTS min_advance_booking_days INTEGER NOT NULL DEFAULT 0 CHECK (min_advance_booking_days >= 0);

ALTER TABLE public.venue_admin_configs
  DROP COLUMN IF EXISTS same_day_cutoff_time;

COMMENT ON COLUMN public.venue_admin_configs.min_advance_booking_days IS
  'Minimum number of full days required before a booking date (platform timezone: America/Los_Angeles).';

DROP FUNCTION IF EXISTS get_venues_with_next_available(DATE, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  policy_min_days INTEGER := 0;
  policy_min_lead_hours INTEGER := 0;
  now_pt TIMESTAMP;
BEGIN
  -- Check if the new booking conflicts with existing bookings
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

  -- Check if the new booking conflicts with recurring bookings
  IF EXISTS (
      SELECT 1 FROM public.recurring_bookings
      WHERE venue_id = NEW.venue_id
      AND date = NEW.date
      AND status IN ('confirmed', 'pending')
      AND (NEW.start_time < end_time AND NEW.end_time > start_time)
  ) THEN
      RAISE EXCEPTION 'Booking time conflicts with existing recurring booking';
  END IF;

  -- Check if the time slot is available
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

  IF NEW.date < (now_pt::date + policy_min_days) THEN
    RAISE EXCEPTION 'Booking does not meet minimum advance booking period';
  END IF;

  IF (NEW.date + NEW.start_time) < (now_pt + make_interval(hours => policy_min_lead_hours)) THEN
    RAISE EXCEPTION 'Booking does not meet minimum lead time';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_venues_with_next_available(
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
    WITH now_pt AS (
      SELECT timezone('America/Los_Angeles', now()) AS ts
    ),
    next_slots AS (
        SELECT DISTINCT ON (a.venue_id)
            a.venue_id,
            a.id AS slot_id,
            a.date AS slot_date,
            a.start_time,
            a.end_time
        FROM availability a
        LEFT JOIN venue_admin_configs vac ON vac.venue_id = a.venue_id
        CROSS JOIN now_pt
        WHERE a.is_available = true
          AND a.date >= (now_pt.ts::date + COALESCE(vac.min_advance_booking_days, 0))
          AND (a.date + a.start_time) >= (now_pt.ts + make_interval(hours => COALESCE(vac.min_advance_lead_time_hours, 0)))
          AND (
              (p_date_filter IS NOT NULL AND a.date = p_date_filter)
              OR (p_date_filter IS NULL)
          )
        ORDER BY a.venue_id, a.date, a.start_time
    )
    SELECT
        v.id AS venue_id,
        v.name AS venue_name,
        v.city AS venue_city,
        v.state AS venue_state,
        v.address AS venue_address,
        v.hourly_rate,
        v.instant_booking,
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
    FROM venues v
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

GRANT EXECUTE ON FUNCTION get_venues_with_next_available TO authenticated, anon;

COMMENT ON FUNCTION get_venues_with_next_available IS
  'Returns active venues with next available slot filtered by minimum advance booking days/lead-time policies in America/Los_Angeles timezone.';
