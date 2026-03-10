CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.process_availability_backfill_queues(
  p_limit INTEGER DEFAULT 25,
  p_horizon_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  venue_id UUID,
  regular_refreshed_rows INTEGER,
  drop_in_refreshed_rows INTEGER
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  published_at TIMESTAMPTZ := NOW();
BEGIN
  RETURN QUERY
  WITH regular_rows AS (
    SELECT row.venue_id, row.refreshed_rows
    FROM public.process_regular_template_sync_queue(p_limit, p_horizon_days) AS row
  ),
  drop_in_rows AS (
    SELECT row.venue_id, row.refreshed_rows
    FROM public.process_drop_in_template_sync_queue(p_limit, p_horizon_days) AS row
  ),
  combined_rows AS (
    SELECT
      COALESCE(regular_rows.venue_id, drop_in_rows.venue_id) AS venue_id,
      COALESCE(regular_rows.refreshed_rows, 0)::INTEGER AS regular_refreshed_rows,
      COALESCE(drop_in_rows.refreshed_rows, 0)::INTEGER AS drop_in_refreshed_rows
    FROM regular_rows
    FULL OUTER JOIN drop_in_rows
      ON drop_in_rows.venue_id = regular_rows.venue_id
  ),
  persisted_publish_state AS (
    INSERT INTO public.venue_availability_publish_states (
      venue_id,
      last_published_at,
      last_publish_error,
      last_publish_error_source
    )
    SELECT
      combined_rows.venue_id,
      published_at,
      CASE
        WHEN publish_state.last_publish_error_source = 'google_block_sync'
          THEN publish_state.last_publish_error
        ELSE NULL
      END,
      CASE
        WHEN publish_state.last_publish_error_source = 'google_block_sync'
          THEN publish_state.last_publish_error_source
        ELSE NULL
      END
    FROM combined_rows
    LEFT JOIN public.venue_availability_publish_states AS publish_state
      ON publish_state.venue_id = combined_rows.venue_id
    ON CONFLICT (venue_id)
    DO UPDATE SET
      last_published_at = EXCLUDED.last_published_at,
      last_publish_error = EXCLUDED.last_publish_error,
      last_publish_error_source = EXCLUDED.last_publish_error_source,
      updated_at = NOW()
    RETURNING venue_id
  )
  SELECT
    combined_rows.venue_id,
    combined_rows.regular_refreshed_rows,
    combined_rows.drop_in_refreshed_rows
  FROM combined_rows
  INNER JOIN persisted_publish_state
    ON persisted_publish_state.venue_id = combined_rows.venue_id;
END;
$$;

COMMENT ON FUNCTION public.process_availability_backfill_queues(INTEGER, INTEGER) IS
  'Processes regular and drop-in long-horizon slot backfill queues, then records slot_refresh publish success for processed venues.';

REVOKE ALL ON FUNCTION public.process_availability_backfill_queues(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_availability_backfill_queues(INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.process_availability_backfill_queues(INTEGER, INTEGER) FROM authenticated;

DO $$
DECLARE
  existing_job RECORD;
BEGIN
  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'availability_backfill_worker_every_5_minutes'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'availability_backfill_worker_every_5_minutes',
    '*/5 * * * *',
    $cron$SELECT public.process_availability_backfill_queues();$cron$
  );
END;
$$;
