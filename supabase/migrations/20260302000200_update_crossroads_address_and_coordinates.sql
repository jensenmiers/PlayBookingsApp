-- One-time Crossroads location correction requested by stakeholder.
-- Data-only migration: updates address + coordinates for existing venue row.
SET search_path = public, extensions;

UPDATE public.venues
SET
  address = '1634 18th St',
  city = 'Santa Monica',
  state = 'CA',
  zip_code = '90404',
  latitude = 34.0234338,
  longitude = -118.4781325,
  location = ST_SetSRID(ST_MakePoint(-118.4781325, 34.0234338), 4326)::geography
WHERE id = '0fade63f-4bf0-489d-962b-1b18b34c8b26'
  AND name = 'Crossroads School';
