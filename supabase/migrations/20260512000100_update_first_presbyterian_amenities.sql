UPDATE public.venues
SET amenities = ARRAY['Indoor Court', 'Parking', 'Bench seating']::text[]
WHERE name = 'First Presbyterian Church of Hollywood';
