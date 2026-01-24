-- Migration: Create RPC function for venues with next available slot
-- This function returns venues with their earliest available time slot
-- Supports optional date filtering and location-based radius filtering

CREATE OR REPLACE FUNCTION get_venues_with_next_available(
    p_date_filter DATE DEFAULT NULL,           -- Optional: filter to specific date
    p_user_lat DOUBLE PRECISION DEFAULT NULL,  -- Optional: user latitude for distance calc
    p_user_lng DOUBLE PRECISION DEFAULT NULL,  -- Optional: user longitude for distance calc
    p_radius_miles DOUBLE PRECISION DEFAULT NULL -- Optional: filter venues within radius
)
RETURNS TABLE (
    venue_id UUID,
    venue_name TEXT,
    venue_city TEXT,
    venue_state TEXT,
    venue_address TEXT,
    hourly_rate NUMERIC,
    instant_booking BOOLEAN,
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
        -- Get the earliest available slot per venue using DISTINCT ON
        -- This is an efficient pattern in PostgreSQL for "first row per group"
        SELECT DISTINCT ON (a.venue_id)
            a.venue_id,
            a.id AS slot_id,
            a.date AS slot_date,
            a.start_time,
            a.end_time
        FROM availability a
        WHERE a.is_available = true
          AND (
              -- If date filter provided, only get slots for that date
              (p_date_filter IS NOT NULL AND a.date = p_date_filter)
              OR
              -- Otherwise, get future slots only (today with future time, or future dates)
              (p_date_filter IS NULL AND (
                  a.date > CURRENT_DATE 
                  OR (a.date = CURRENT_DATE AND a.start_time > CURRENT_TIME)
              ))
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
        v.latitude,
        v.longitude,
        -- Calculate distance in miles if user location provided
        CASE 
            WHEN p_user_lat IS NOT NULL 
                 AND p_user_lng IS NOT NULL 
                 AND v.location IS NOT NULL
            THEN ST_Distance(
                v.location,
                ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
            ) / 1609.34  -- Convert meters to miles
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
      -- Apply radius filter if all location params provided
      AND (
          p_radius_miles IS NULL 
          OR p_user_lat IS NULL 
          OR p_user_lng IS NULL
          OR ST_DWithin(
              v.location,
              ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography,
              p_radius_miles * 1609.34  -- Convert miles to meters
          )
      )
    ORDER BY 
        -- Sort by distance if user location provided, otherwise by venue name
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

-- Grant execute permission to authenticated and anonymous users
-- Anonymous users can view venues (public data), authenticated can book
GRANT EXECUTE ON FUNCTION get_venues_with_next_available TO authenticated, anon;

-- Add documentation
COMMENT ON FUNCTION get_venues_with_next_available IS 'Returns active venues with coordinates and their next available time slot. Supports optional date filtering and location-based radius queries using PostGIS.';
