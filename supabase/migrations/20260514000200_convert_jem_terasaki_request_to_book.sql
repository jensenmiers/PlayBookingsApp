-- Convert JEM Community Center and Terasaki Budokan from instant slots to request-to-book.

WITH target_venues AS (
  SELECT id
  FROM public.venues
  WHERE (id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid AND name = 'JEM Community Center')
     OR (id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid AND name = 'Terasaki Budokan')
)
UPDATE public.venues v
SET
  instant_booking = false,
  booking_mode = 'request_to_book'
FROM target_venues tv
WHERE v.id = tv.id;

WITH target_venues AS (
  SELECT id
  FROM public.venues
  WHERE (id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid AND name = 'JEM Community Center')
     OR (id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid AND name = 'Terasaki Budokan')
)
UPDATE public.slot_templates st
SET
  action_type = 'request_private',
  updated_at = now()
FROM target_venues tv
WHERE st.venue_id = tv.id
  AND st.is_active = true
  AND st.action_type = 'instant_book';

WITH target_venues AS (
  SELECT id
  FROM public.venues
  WHERE (id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid AND name = 'JEM Community Center')
     OR (id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid AND name = 'Terasaki Budokan')
)
DELETE FROM public.slot_instances si
USING target_venues tv
WHERE si.venue_id = tv.id
  AND si.is_active = true
  AND si.date >= ((now() AT TIME ZONE 'America/Los_Angeles')::date)
  AND si.action_type = 'instant_book'
  AND EXISTS (
    SELECT 1
    FROM public.slot_instances existing
    WHERE existing.venue_id = si.venue_id
      AND existing.date = si.date
      AND existing.start_time = si.start_time
      AND existing.end_time = si.end_time
      AND existing.action_type = 'request_private'
  );

WITH target_venues AS (
  SELECT id
  FROM public.venues
  WHERE (id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid AND name = 'JEM Community Center')
     OR (id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid AND name = 'Terasaki Budokan')
)
UPDATE public.slot_instances si
SET
  action_type = 'request_private',
  updated_at = now()
FROM target_venues tv
WHERE si.venue_id = tv.id
  AND si.is_active = true
  AND si.date >= ((now() AT TIME ZONE 'America/Los_Angeles')::date)
  AND si.action_type = 'instant_book';

SELECT public.enqueue_regular_template_sync(
  'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid,
  'booking_mode_changed_to_request_to_book',
  0
)
WHERE EXISTS (
  SELECT 1
  FROM public.venues
  WHERE id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'::uuid
    AND name = 'JEM Community Center'
);

SELECT public.enqueue_regular_template_sync(
  'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid,
  'booking_mode_changed_to_request_to_book',
  0
)
WHERE EXISTS (
  SELECT 1
  FROM public.venues
  WHERE id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'::uuid
    AND name = 'Terasaki Budokan'
);

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
  'Returns active venues with their next regular slot_instance (instant/request), filtered by policy and external blocks.';
