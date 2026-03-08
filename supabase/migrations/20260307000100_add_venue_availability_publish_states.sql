CREATE TABLE IF NOT EXISTS public.venue_availability_publish_states (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  last_published_at TIMESTAMPTZ NULL,
  last_publish_error TEXT NULL,
  last_publish_error_source TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_availability_publish_states_error_source_check CHECK (
    last_publish_error_source IN ('slot_refresh', 'google_block_sync') OR last_publish_error_source IS NULL
  )
);

DROP TRIGGER IF EXISTS set_venue_availability_publish_states_updated_at ON public.venue_availability_publish_states;
CREATE TRIGGER set_venue_availability_publish_states_updated_at
  BEFORE UPDATE ON public.venue_availability_publish_states
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.venue_availability_publish_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage venue availability publish states" ON public.venue_availability_publish_states;
CREATE POLICY "Admins can manage venue availability publish states"
  ON public.venue_availability_publish_states
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

COMMENT ON TABLE public.venue_availability_publish_states IS
  'Per-venue near-term availability publication state used for renter-facing readiness messaging.';
