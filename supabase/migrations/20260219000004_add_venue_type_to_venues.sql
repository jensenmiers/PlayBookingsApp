-- Migration: Add venue_type to venues and backfill existing records

ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS venue_type TEXT;

UPDATE public.venues
SET venue_type = CASE
  WHEN lower(name) LIKE '%school%'
    OR lower(name) = 'immaculate heart'
    THEN 'School Gymnasium'
  WHEN lower(name) LIKE '%church%'
    OR lower(name) LIKE '%presbyterian%'
    THEN 'Church Gymnasium'
  WHEN lower(name) LIKE '%boys & girls club%'
    OR lower(name) LIKE '%community center%'
    THEN 'Community Center'
  WHEN lower(name) LIKE '%crosscourt%'
    THEN 'Private Facility'
  WHEN lower(name) LIKE '%park%'
    OR lower(name) LIKE '%budokan%'
    OR lower(coalesce(description, '')) LIKE '%recreation center%'
    THEN 'Recreation Center'
  ELSE 'Sports Facility'
END
WHERE venue_type IS NULL
   OR btrim(venue_type) = '';

ALTER TABLE public.venues
ALTER COLUMN venue_type SET DEFAULT 'Sports Facility';

ALTER TABLE public.venues
ALTER COLUMN venue_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venues_venue_type_check'
  ) THEN
    ALTER TABLE public.venues
    ADD CONSTRAINT venues_venue_type_check
    CHECK (
      venue_type IN (
        'School Gymnasium',
        'Recreation Center',
        'Community Center',
        'Private Facility',
        'Church Gymnasium',
        'Sports Facility'
      )
    );
  END IF;
END $$;

COMMENT ON COLUMN public.venues.venue_type IS 'Business classification for venue card display and filtering.';
