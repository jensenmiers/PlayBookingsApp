-- Queue-based background sync for drop-in slot template materialization.
-- Canonical config lives in venue_admin_configs + slot_templates; slot_instances are generated output.

CREATE TABLE IF NOT EXISTS public.drop_in_template_sync_queue (
  venue_id UUID PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'unspecified',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_after TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drop_in_template_sync_queue_run_after
  ON public.drop_in_template_sync_queue (run_after);

DROP TRIGGER IF EXISTS set_drop_in_template_sync_queue_updated_at ON public.drop_in_template_sync_queue;
CREATE TRIGGER set_drop_in_template_sync_queue_updated_at
  BEFORE UPDATE ON public.drop_in_template_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.drop_in_template_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage drop-in template sync queue" ON public.drop_in_template_sync_queue;
CREATE POLICY "Admins can manage drop-in template sync queue"
  ON public.drop_in_template_sync_queue
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

CREATE OR REPLACE FUNCTION public.enqueue_drop_in_template_sync(
  p_venue_id UUID,
  p_reason TEXT DEFAULT 'unspecified',
  p_delay_minutes INTEGER DEFAULT 5
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  delay_minutes INTEGER := GREATEST(COALESCE(p_delay_minutes, 5), 0);
BEGIN
  INSERT INTO public.drop_in_template_sync_queue (
    venue_id,
    reason,
    requested_at,
    run_after,
    attempts,
    last_error
  )
  VALUES (
    p_venue_id,
    COALESCE(NULLIF(TRIM(p_reason), ''), 'unspecified'),
    NOW(),
    NOW() + make_interval(mins => delay_minutes),
    0,
    NULL
  )
  ON CONFLICT (venue_id)
  DO UPDATE SET
    reason = EXCLUDED.reason,
    requested_at = EXCLUDED.requested_at,
    run_after = EXCLUDED.run_after,
    attempts = 0,
    last_error = NULL,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.process_drop_in_template_sync_queue(
  p_limit INTEGER DEFAULT 25,
  p_horizon_days INTEGER DEFAULT 180
)
RETURNS TABLE (
  venue_id UUID,
  refreshed_rows INTEGER
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  queue_row RECORD;
  rows_written INTEGER;
  safe_limit INTEGER := GREATEST(COALESCE(p_limit, 25), 1);
  safe_horizon_days INTEGER := GREATEST(COALESCE(p_horizon_days, 180), 1);
BEGIN
  FOR queue_row IN
    SELECT q.venue_id
    FROM public.drop_in_template_sync_queue q
    WHERE q.run_after <= NOW()
    ORDER BY q.requested_at ASC
    LIMIT safe_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      rows_written := public.refresh_slot_instances_from_templates(
        queue_row.venue_id,
        CURRENT_DATE,
        (CURRENT_DATE + make_interval(days => safe_horizon_days))::date
      );

      DELETE FROM public.drop_in_template_sync_queue
      WHERE drop_in_template_sync_queue.venue_id = queue_row.venue_id;

      venue_id := queue_row.venue_id;
      refreshed_rows := rows_written;
      RETURN NEXT;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.drop_in_template_sync_queue
        SET
          attempts = attempts + 1,
          last_error = SQLERRM,
          run_after = NOW() + INTERVAL '5 minutes',
          updated_at = NOW()
        WHERE drop_in_template_sync_queue.venue_id = queue_row.venue_id;
    END;
  END LOOP;
END;
$$;

DO $$
DECLARE
  seeded_count INTEGER := 0;
BEGIN
  WITH venues_to_seed AS (
    SELECT vac.venue_id
    FROM public.venue_admin_configs vac
    WHERE vac.drop_in_enabled = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.slot_templates st
        WHERE st.venue_id = vac.venue_id
          AND st.action_type = 'info_only_open_gym'
      )
  ),
  candidate_windows AS (
    SELECT
      a.venue_id,
      EXTRACT(DOW FROM a.date)::smallint AS day_of_week,
      a.start_time,
      a.end_time
    FROM public.availability a
    JOIN venues_to_seed vts ON vts.venue_id = a.venue_id
    WHERE a.is_available = true
    GROUP BY a.venue_id, EXTRACT(DOW FROM a.date), a.start_time, a.end_time
  ),
  numbered_windows AS (
    SELECT
      cw.*,
      ROW_NUMBER() OVER (
        PARTITION BY cw.venue_id
        ORDER BY cw.day_of_week ASC, cw.start_time ASC, cw.end_time ASC
      ) AS seq
    FROM candidate_windows cw
  )
  INSERT INTO public.slot_templates (
    venue_id,
    name,
    action_type,
    day_of_week,
    start_time,
    end_time,
    slot_interval_minutes,
    blocks_inventory,
    is_active,
    metadata
  )
  SELECT
    nw.venue_id,
    CONCAT('Imported Drop-In Window ', nw.seq),
    'info_only_open_gym',
    nw.day_of_week,
    nw.start_time,
    nw.end_time,
    60,
    true,
    true,
    '{}'::jsonb
  FROM numbered_windows nw;

  GET DIAGNOSTICS seeded_count = ROW_COUNT;

  IF seeded_count > 0 THEN
    INSERT INTO public.drop_in_template_sync_queue (venue_id, reason, requested_at, run_after)
    SELECT DISTINCT
      st.venue_id,
      'legacy_availability_backfill',
      NOW(),
      NOW() + INTERVAL '5 minutes'
    FROM public.slot_templates st
    WHERE st.action_type = 'info_only_open_gym'
      AND st.name LIKE 'Imported Drop-In Window %'
    ON CONFLICT (venue_id)
    DO UPDATE SET
      reason = EXCLUDED.reason,
      requested_at = EXCLUDED.requested_at,
      run_after = EXCLUDED.run_after,
      attempts = 0,
      last_error = NULL,
      updated_at = NOW();
  END IF;
END
$$;
