-- Super-admin venue configuration table
-- Stores per-venue operational and policy controls used by booking/runtime flows.

CREATE TABLE IF NOT EXISTS public.venue_admin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
  drop_in_enabled BOOLEAN NOT NULL DEFAULT false,
  drop_in_price NUMERIC NULL CHECK (drop_in_price IS NULL OR drop_in_price > 0),
  min_advance_lead_time_hours INTEGER NOT NULL DEFAULT 0 CHECK (min_advance_lead_time_hours >= 0),
  same_day_cutoff_time TIME NULL,
  operating_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
  blackout_dates DATE[] NOT NULL DEFAULT '{}'::date[],
  holiday_dates DATE[] NOT NULL DEFAULT '{}'::date[],
  insurance_requires_manual_approval BOOLEAN NOT NULL DEFAULT true,
  insurance_document_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  policy_cancel TEXT NULL,
  policy_reschedule TEXT NULL,
  policy_no_show TEXT NULL,
  review_cadence_days INTEGER NOT NULL DEFAULT 30 CHECK (review_cadence_days >= 1 AND review_cadence_days <= 365),
  last_reviewed_at TIMESTAMPTZ NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_admin_configs_venue_id
  ON public.venue_admin_configs (venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_admin_configs_last_reviewed
  ON public.venue_admin_configs (last_reviewed_at);

COMMENT ON TABLE public.venue_admin_configs IS
  'Per-venue admin-managed configuration that drives booking policy and operational behavior.';

COMMENT ON COLUMN public.venue_admin_configs.operating_hours IS
  'JSONB array of windows: [{day_of_week:0-6,start_time:HH:MM:SS,end_time:HH:MM:SS}]';

COMMENT ON COLUMN public.venue_admin_configs.blackout_dates IS
  'Dates where no bookings are allowed.';

COMMENT ON COLUMN public.venue_admin_configs.same_day_cutoff_time IS
  'Local time cutoff after which same-day bookings are blocked.';

-- Ensure shared updated-at trigger function exists
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_venue_admin_configs_updated_at ON public.venue_admin_configs;
CREATE TRIGGER set_venue_admin_configs_updated_at
  BEFORE UPDATE ON public.venue_admin_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.venue_admin_configs ENABLE ROW LEVEL SECURITY;

-- Config must be readable by runtime booking/availability flows.
DROP POLICY IF EXISTS "Public can view venue admin configs" ON public.venue_admin_configs;
CREATE POLICY "Public can view venue admin configs"
  ON public.venue_admin_configs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can fully manage all venue configs
DROP POLICY IF EXISTS "Admins can manage all venue admin configs" ON public.venue_admin_configs;
CREATE POLICY "Admins can manage all venue admin configs"
  ON public.venue_admin_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  );
