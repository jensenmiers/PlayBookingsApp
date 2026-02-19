-- Add capability flags to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_renter BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_venue_owner BOOLEAN NOT NULL DEFAULT false;

-- Backfill based on existing role values
UPDATE public.users SET is_venue_owner = true WHERE role = 'venue_owner';
UPDATE public.users SET is_renter = true WHERE role = 'renter';
-- Admins get both capabilities
UPDATE public.users SET is_venue_owner = true, is_renter = true WHERE role = 'admin';
;
