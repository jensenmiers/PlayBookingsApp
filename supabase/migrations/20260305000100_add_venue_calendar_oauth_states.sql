CREATE TABLE IF NOT EXISTS public.venue_calendar_oauth_states (
  state_nonce TEXT PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  initiated_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_calendar_oauth_states_expires_at
  ON public.venue_calendar_oauth_states (expires_at);

ALTER TABLE public.venue_calendar_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage venue calendar oauth states" ON public.venue_calendar_oauth_states;
CREATE POLICY "Admins can manage venue calendar oauth states"
  ON public.venue_calendar_oauth_states
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

COMMENT ON TABLE public.venue_calendar_oauth_states IS
  'Short-lived one-time OAuth state records used to map Google calendar callbacks back to a venue and initiating admin.';
