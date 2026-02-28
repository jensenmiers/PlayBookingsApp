-- Regular booking weekly schedule support.
-- Adds sticky template mode + async queue processor for regular slot template refreshes.

ALTER TABLE public.venue_admin_configs
  ADD COLUMN IF NOT EXISTS regular_schedule_mode TEXT NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venue_admin_configs_regular_schedule_mode_check'
  ) THEN
    ALTER TABLE public.venue_admin_configs
      ADD CONSTRAINT venue_admin_configs_regular_schedule_mode_check
      CHECK (regular_schedule_mode IN ('legacy', 'template'));
  END IF;
END
$$;

COMMENT ON COLUMN public.venue_admin_configs.regular_schedule_mode IS
  'Regular booking source model. legacy=availability table, template=slot_templates generated schedule.';

CREATE TABLE IF NOT EXISTS public.regular_template_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL UNIQUE REFERENCES public.venues(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'unspecified',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regular_template_sync_queue_run_after
  ON public.regular_template_sync_queue (run_after);

DROP TRIGGER IF EXISTS set_regular_template_sync_queue_updated_at ON public.regular_template_sync_queue;
CREATE TRIGGER set_regular_template_sync_queue_updated_at
  BEFORE UPDATE ON public.regular_template_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.regular_template_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage regular template sync queue" ON public.regular_template_sync_queue;
CREATE POLICY "Admins can manage regular template sync queue"
  ON public.regular_template_sync_queue
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

CREATE OR REPLACE FUNCTION public.enqueue_regular_template_sync(
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
  INSERT INTO public.regular_template_sync_queue (
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

CREATE OR REPLACE FUNCTION public.process_regular_template_sync_queue(
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
    FROM public.regular_template_sync_queue q
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

      DELETE FROM public.regular_template_sync_queue
      WHERE regular_template_sync_queue.venue_id = queue_row.venue_id;

      venue_id := queue_row.venue_id;
      refreshed_rows := rows_written;
      RETURN NEXT;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.regular_template_sync_queue
        SET
          attempts = attempts + 1,
          last_error = SQLERRM,
          run_after = NOW() + INTERVAL '5 minutes',
          updated_at = NOW()
        WHERE regular_template_sync_queue.venue_id = queue_row.venue_id;
    END;
  END LOOP;
END;
$$;
