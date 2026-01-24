-- Migration: Enable PostGIS Extension
-- Required for geographic data types and spatial queries
-- This extension is available on all Supabase plans

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extension is enabled (this will fail if PostGIS is not available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    RAISE EXCEPTION 'PostGIS extension failed to enable. Check your Supabase plan.';
  END IF;
END $$;

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';
