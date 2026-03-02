-- One-time correction of venue coordinates using Google Maps default address pins.
-- This migration is data-only and does not reseed/reset any tables.
SET search_path = public, extensions;

UPDATE public.venues
SET
  latitude = 34.0868793,
  longitude = -118.3283874,
  location = ST_SetSRID(ST_MakePoint(-118.3283874, 34.0868793), 4326)::geography
WHERE id = 'd1dd2e16-e351-4343-8f51-0cf7300273d2'
  AND name = 'Boys & Girls Club of Hollywood';

UPDATE public.venues
SET
  latitude = 34.0521346,
  longitude = -118.2272867,
  location = ST_SetSRID(ST_MakePoint(-118.2272867, 34.0521346), 4326)::geography
WHERE id = '8abbaea0-d931-4286-9160-04a1b9625b3f'
  AND name = 'Crosscourt';

UPDATE public.venues
SET
  latitude = 34.0245,
  longitude = -118.4737244,
  location = ST_SetSRID(ST_MakePoint(-118.4737244, 34.0245), 4326)::geography
WHERE id = '0fade63f-4bf0-489d-962b-1b18b34c8b26'
  AND name = 'Crossroads School';

UPDATE public.venues
SET
  latitude = 34.1033108,
  longitude = -118.3220431,
  location = ST_SetSRID(ST_MakePoint(-118.3220431, 34.1033108), 4326)::geography
WHERE id = '4dcff5d1-df04-4081-97dd-2aad958c0c40'
  AND name = 'First Presbyterian Church of Hollywood';

UPDATE public.venues
SET
  latitude = 34.10609585,
  longitude = -118.3104325,
  location = ST_SetSRID(ST_MakePoint(-118.3104325, 34.10609585), 4326)::geography
WHERE id = '7835399d-47d0-4c0c-822d-12f39c0b21c6'
  AND name = 'Immaculate Heart';

UPDATE public.venues
SET
  latitude = 34.0647081,
  longitude = -118.4123853,
  location = ST_SetSRID(ST_MakePoint(-118.4123853, 34.0647081), 4326)::geography
WHERE id = 'a23aaa2c-f6d2-462c-855e-85246346b40d'
  AND name = 'JEM Community Center';

UPDATE public.venues
SET
  latitude = 34.02113525,
  longitude = -118.4804420,
  location = ST_SetSRID(ST_MakePoint(-118.4804420, 34.02113525), 4326)::geography
WHERE id = '5acc1e4c-49b6-491d-8b0a-6a2b3e2d8094'
  AND name = 'Memorial Park';

UPDATE public.venues
SET
  latitude = 34.0492092,
  longitude = -118.2445363,
  location = ST_SetSRID(ST_MakePoint(-118.2445363, 34.0492092), 4326)::geography
WHERE id = 'ef966d78-a26e-4cad-be54-bf40255ef23f'
  AND name = 'Terasaki Budokan';
