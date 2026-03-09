-- Fix Google Calendar external block upserts.
-- PostgREST/Supabase upserts target ON CONFLICT (venue_id, source, source_event_id),
-- which cannot infer the previous partial unique index. Replace it with a non-partial
-- unique index so calendar sync can upsert by source event id reliably.

WITH ranked_blocks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY venue_id, source, source_event_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.external_availability_blocks
  WHERE source_event_id IS NOT NULL
)
DELETE FROM public.external_availability_blocks eab
USING ranked_blocks rb
WHERE eab.id = rb.id
  AND rb.row_number > 1;

DROP INDEX IF EXISTS public.idx_external_availability_blocks_source_event;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_availability_blocks_source_event
  ON public.external_availability_blocks (venue_id, source, source_event_id);
