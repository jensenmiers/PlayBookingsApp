-- Migration: Add geography column to venues table
-- This enables efficient spatial queries using PostGIS
-- SRID 4326 = WGS84 (standard GPS coordinate system used by Mapbox, Google Maps, etc.)

-- Step 1: Add geography column to venues table
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Step 2: Migrate existing latitude/longitude data to geography column
-- Note: ST_MakePoint takes (longitude, latitude) - X, Y order
UPDATE venues
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND location IS NULL;

-- Step 3: Create GIST index for efficient spatial queries
-- This is critical for performance - without it, spatial queries do full table scans
CREATE INDEX IF NOT EXISTS idx_venues_location_gist 
ON venues 
USING GIST (location);

-- Step 4: Create partial index for active venues with locations (optimization)
-- This index is used when filtering by is_active = true
CREATE INDEX IF NOT EXISTS idx_venues_location_gist_active 
ON venues 
USING GIST (location) 
WHERE is_active = true AND location IS NOT NULL;

-- Step 5: Add index on availability for the next-available query optimization
-- This helps the DISTINCT ON query perform better
CREATE INDEX IF NOT EXISTS idx_availability_venue_date_time 
ON availability (venue_id, date, start_time)
WHERE is_available = true;

-- Add documentation comment
COMMENT ON COLUMN venues.location IS 'Geographic point (WGS84/SRID 4326) for spatial queries. Populated from latitude/longitude. Use ST_X(location::geometry) for longitude, ST_Y(location::geometry) for latitude.';
