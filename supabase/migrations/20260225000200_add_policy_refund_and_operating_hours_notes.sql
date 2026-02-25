ALTER TABLE public.venue_admin_configs
  ADD COLUMN IF NOT EXISTS policy_refund TEXT NULL,
  ADD COLUMN IF NOT EXISTS policy_operating_hours_notes TEXT NULL;
