-- Google Calendar integration metadata and token storage.
-- Runtime slot eligibility continues to use slot_instances + external_availability_blocks.

CREATE TABLE IF NOT EXISTS public.venue_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  google_calendar_id TEXT NULL,
  google_calendar_name TEXT NULL,
  google_account_email TEXT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_synced_at TIMESTAMPTZ NULL,
  next_sync_at TIMESTAMPTZ NULL,
  sync_cursor TEXT NULL,
  last_error TEXT NULL,
  updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_calendar_integrations_provider_check CHECK (
    provider IN ('google_calendar')
  ),
  CONSTRAINT venue_calendar_integrations_status_check CHECK (
    status IN ('disconnected', 'connected', 'error')
  ),
  CONSTRAINT venue_calendar_integrations_sync_interval_check CHECK (
    sync_interval_minutes >= 1 AND sync_interval_minutes <= 1440
  )
);

CREATE INDEX IF NOT EXISTS idx_venue_calendar_integrations_venue_status_next_sync
  ON public.venue_calendar_integrations (venue_id, status, next_sync_at);

CREATE INDEX IF NOT EXISTS idx_venue_calendar_integrations_due_sync
  ON public.venue_calendar_integrations (sync_enabled, status, next_sync_at);

DROP TRIGGER IF EXISTS set_venue_calendar_integrations_updated_at ON public.venue_calendar_integrations;
CREATE TRIGGER set_venue_calendar_integrations_updated_at
  BEFORE UPDATE ON public.venue_calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.venue_calendar_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage venue calendar integrations" ON public.venue_calendar_integrations;
CREATE POLICY "Admins can manage venue calendar integrations"
  ON public.venue_calendar_integrations
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

CREATE TABLE IF NOT EXISTS public.venue_calendar_tokens (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_venue_calendar_tokens_updated_at ON public.venue_calendar_tokens;
CREATE TRIGGER set_venue_calendar_tokens_updated_at
  BEFORE UPDATE ON public.venue_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.venue_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage venue calendar tokens" ON public.venue_calendar_tokens;
CREATE POLICY "Admins can manage venue calendar tokens"
  ON public.venue_calendar_tokens
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

COMMENT ON TABLE public.venue_calendar_integrations IS
  'Per-venue Google Calendar integration status, selected calendar, and sync schedule state.';

COMMENT ON TABLE public.venue_calendar_tokens IS
  'Encrypted OAuth tokens for venue calendar integrations. Server-only access.';
