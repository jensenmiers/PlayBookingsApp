CREATE TABLE IF NOT EXISTS public.auth_oauth_states (
  state_nonce TEXT PRIMARY KEY,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('popup', 'redirect')),
  return_to TEXT NULL,
  intent TEXT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_oauth_states_expires_at
  ON public.auth_oauth_states (expires_at);

ALTER TABLE public.auth_oauth_states ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.auth_oauth_states IS
  'Short-lived one-time OAuth flow records used to distinguish popup auth from full-window auth callbacks.';
