UPDATE public.venues
SET is_active = false
WHERE name IN (
  'Immaculate Heart',
  'Boys & Girls Club of Hollywood'
);
