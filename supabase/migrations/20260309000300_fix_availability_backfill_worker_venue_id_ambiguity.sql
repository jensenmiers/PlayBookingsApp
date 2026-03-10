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
    SELECT regular_result.venue_id, regular_result.refreshed_rows
    FROM public.process_regular_template_sync_queue(p_limit, p_horizon_days) AS regular_result
  ),
  drop_in_rows AS (
    SELECT drop_in_result.venue_id, drop_in_result.refreshed_rows
    FROM public.process_drop_in_template_sync_queue(p_limit, p_horizon_days) AS drop_in_result
  ),
  combined_rows AS (
    SELECT
      COALESCE(regular_rows.venue_id, drop_in_rows.venue_id) AS processed_venue_id,
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
      combined_rows.processed_venue_id,
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
      ON publish_state.venue_id = combined_rows.processed_venue_id
    ON CONFLICT (venue_id)
    DO UPDATE SET
      last_published_at = EXCLUDED.last_published_at,
      last_publish_error = EXCLUDED.last_publish_error,
      last_publish_error_source = EXCLUDED.last_publish_error_source,
      updated_at = NOW()
    RETURNING public.venue_availability_publish_states.venue_id AS processed_venue_id
  )
  SELECT
    combined_rows.processed_venue_id,
    combined_rows.regular_refreshed_rows,
    combined_rows.drop_in_refreshed_rows
  FROM combined_rows
  INNER JOIN persisted_publish_state
    ON persisted_publish_state.processed_venue_id = combined_rows.processed_venue_id;
END;
$$;
