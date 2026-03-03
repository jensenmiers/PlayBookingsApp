-- Prevent sync churn for integrations that connected OAuth but do not yet have a selected calendar.
UPDATE public.venue_calendar_integrations
SET
  status = 'connected',
  sync_enabled = false,
  next_sync_at = NULL,
  sync_cursor = NULL,
  last_error = NULL,
  updated_at = NOW()
WHERE provider = 'google_calendar'
  AND google_calendar_id IS NULL
  AND status IN ('connected', 'error')
  AND (
    sync_enabled IS DISTINCT FROM false
    OR next_sync_at IS NOT NULL
    OR sync_cursor IS NOT NULL
    OR last_error IS NOT NULL
    OR status IS DISTINCT FROM 'connected'
  );
