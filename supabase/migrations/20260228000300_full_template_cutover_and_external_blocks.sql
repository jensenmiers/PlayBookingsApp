-- Full template-driven cutover for regular bookings + external availability blocks foundation.
-- Keeps legacy availability table physically present for rollback/audit.

CREATE TABLE IF NOT EXISTS public.external_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_event_id TEXT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT external_availability_blocks_status_check CHECK (status IN ('active', 'cancelled')),
  CONSTRAINT external_availability_blocks_time_range_check CHECK (start_at < end_at)
);

CREATE INDEX IF NOT EXISTS idx_external_availability_blocks_venue_status_time
  ON public.external_availability_blocks (venue_id, status, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_external_availability_blocks_time_range_gist
  ON public.external_availability_blocks
  USING GIST (tstzrange(start_at, end_at, '[)'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_availability_blocks_source_event
  ON public.external_availability_blocks (venue_id, source, source_event_id)
  WHERE source_event_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_external_availability_blocks_updated_at ON public.external_availability_blocks;
CREATE TRIGGER set_external_availability_blocks_updated_at
  BEFORE UPDATE ON public.external_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.external_availability_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active external availability blocks" ON public.external_availability_blocks;
CREATE POLICY "Public can read active external availability blocks"
  ON public.external_availability_blocks
  FOR SELECT
  TO authenticated, anon
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.venues v
      WHERE v.id = external_availability_blocks.venue_id
        AND v.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage external availability blocks" ON public.external_availability_blocks;
CREATE POLICY "Admins can manage external availability blocks"
  ON public.external_availability_blocks
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

COMMENT ON TABLE public.external_availability_blocks IS
  'External (ex: Google Calendar) blocking windows that hide/deny overlapping slot instances.';

COMMENT ON COLUMN public.external_availability_blocks.source IS
  'External block source identifier, ex: google_calendar, manual_admin, system.';

INSERT INTO public.venue_admin_configs (
  venue_id,
  regular_schedule_mode
)
SELECT
  v.id,
  'template'
FROM public.venues v
ON CONFLICT (venue_id) DO NOTHING;

UPDATE public.venue_admin_configs
SET
  regular_schedule_mode = 'template',
  updated_at = NOW()
WHERE regular_schedule_mode IS DISTINCT FROM 'template';

DO $$
DECLARE
  seeded_count INTEGER := 0;
BEGIN
  WITH venues_without_regular_templates AS (
    SELECT v.id AS venue_id, v.instant_booking
    FROM public.venues v
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.slot_templates st
      WHERE st.venue_id = v.id
        AND st.action_type IN ('instant_book', 'request_private')
        AND st.name LIKE 'Regular Booking Window %'
    )
  ),
  candidate_windows AS (
    SELECT
      a.venue_id,
      v.instant_booking,
      EXTRACT(DOW FROM a.date)::smallint AS day_of_week,
      a.start_time,
      a.end_time
    FROM public.availability a
    JOIN venues_without_regular_templates v ON v.venue_id = a.venue_id
    WHERE a.is_available = true
    GROUP BY a.venue_id, v.instant_booking, EXTRACT(DOW FROM a.date), a.start_time, a.end_time
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
    CONCAT('Regular Booking Window ', nw.seq),
    (
      CASE
        WHEN nw.instant_booking THEN 'instant_book'
        ELSE 'request_private'
      END
    )::public.slot_action_type,
    nw.day_of_week,
    nw.start_time,
    nw.end_time,
    60,
    false,
    true,
    jsonb_build_object('source', 'legacy_availability_backfill')
  FROM numbered_windows nw;

  GET DIAGNOSTICS seeded_count = ROW_COUNT;
  RAISE NOTICE 'Seeded % regular booking templates from legacy availability', seeded_count;
END
$$;

DO $$
DECLARE
  venue_row RECORD;
BEGIN
  FOR venue_row IN
    SELECT v.id
    FROM public.venues v
    WHERE v.is_active = true
  LOOP
    BEGIN
      PERFORM public.refresh_slot_instances_from_templates(
        venue_row.id,
        CURRENT_DATE,
        (CURRENT_DATE + INTERVAL '30 days')::date
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Inline refresh failed for venue %: %', venue_row.id, SQLERRM;
    END;
  END LOOP;
END
$$;

INSERT INTO public.regular_template_sync_queue (
  venue_id,
  reason,
  requested_at,
  run_after,
  attempts,
  last_error
)
SELECT
  v.id,
  'global_template_cutover_180_day_backfill',
  NOW(),
  NOW(),
  0,
  NULL
FROM public.venues v
WHERE v.is_active = true
ON CONFLICT (venue_id) DO UPDATE
SET
  reason = EXCLUDED.reason,
  requested_at = EXCLUDED.requested_at,
  run_after = EXCLUDED.run_after,
  attempts = 0,
  last_error = NULL,
  updated_at = NOW();

INSERT INTO public.drop_in_template_sync_queue (
  venue_id,
  reason,
  requested_at,
  run_after,
  attempts,
  last_error
)
SELECT
  v.id,
  'global_template_cutover_180_day_backfill',
  NOW(),
  NOW(),
  0,
  NULL
FROM public.venues v
WHERE v.is_active = true
ON CONFLICT (venue_id) DO UPDATE
SET
  reason = EXCLUDED.reason,
  requested_at = EXCLUDED.requested_at,
  run_after = EXCLUDED.run_after,
  attempts = 0,
  last_error = NULL,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.get_venues_with_next_available(
    p_date_filter DATE DEFAULT NULL,
    p_user_lat DOUBLE PRECISION DEFAULT NULL,
    p_user_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius_miles DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
    venue_id UUID,
    venue_name TEXT,
    venue_city TEXT,
    venue_state TEXT,
    venue_address TEXT,
    hourly_rate NUMERIC,
    instant_booking BOOLEAN,
    insurance_required BOOLEAN,
    latitude NUMERIC,
    longitude NUMERIC,
    distance_miles DOUBLE PRECISION,
    next_slot_id UUID,
    next_slot_date DATE,
    next_slot_start_time TIME,
    next_slot_end_time TIME
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    WITH now_pt AS (
      SELECT timezone('America/Los_Angeles', now()) AS ts
    ),
    active_blocks AS (
      SELECT
        eab.venue_id,
        tstzrange(eab.start_at, eab.end_at, '[)') AS block_range
      FROM external_availability_blocks eab
      WHERE eab.status = 'active'
    ),
    next_slots AS (
        SELECT DISTINCT ON (si.venue_id)
            si.venue_id,
            si.id AS slot_id,
            si.date AS slot_date,
            si.start_time,
            si.end_time
        FROM slot_instances si
        LEFT JOIN venue_admin_configs vac ON vac.venue_id = si.venue_id
        CROSS JOIN now_pt
        WHERE si.is_active = true
          AND si.action_type IN ('instant_book', 'request_private')
          AND si.date >= (now_pt.ts::date + COALESCE(vac.min_advance_booking_days, 0))
          AND (si.date + si.start_time) >= (now_pt.ts + make_interval(hours => COALESCE(vac.min_advance_lead_time_hours, 0)))
          AND (
              (p_date_filter IS NOT NULL AND si.date = p_date_filter)
              OR (p_date_filter IS NULL)
          )
          AND NOT EXISTS (
            SELECT 1
            FROM active_blocks ab
            WHERE ab.venue_id = si.venue_id
              AND ab.block_range && tstzrange(
                (si.date + si.start_time) AT TIME ZONE 'America/Los_Angeles',
                (si.date + si.end_time) AT TIME ZONE 'America/Los_Angeles',
                '[)'
              )
          )
        ORDER BY si.venue_id, si.date, si.start_time
    )
    SELECT
        v.id AS venue_id,
        v.name AS venue_name,
        v.city AS venue_city,
        v.state AS venue_state,
        v.address AS venue_address,
        v.hourly_rate,
        v.instant_booking,
        v.insurance_required,
        v.latitude,
        v.longitude,
        CASE
            WHEN p_user_lat IS NOT NULL
                 AND p_user_lng IS NOT NULL
                 AND v.location IS NOT NULL
            THEN ST_Distance(
                v.location,
                ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
            ) / 1609.34
            ELSE NULL
        END AS distance_miles,
        ns.slot_id AS next_slot_id,
        ns.slot_date AS next_slot_date,
        ns.start_time AS next_slot_start_time,
        ns.end_time AS next_slot_end_time
    FROM venues v
    LEFT JOIN next_slots ns ON v.id = ns.venue_id
    WHERE v.is_active = true
      AND v.location IS NOT NULL
      AND (
          p_radius_miles IS NULL
          OR p_user_lat IS NULL
          OR p_user_lng IS NULL
          OR ST_DWithin(
              v.location,
              ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography,
              p_radius_miles * 1609.34
          )
      )
    ORDER BY
        CASE
            WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
            THEN ST_Distance(
                v.location,
                ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
            )
            ELSE NULL
        END NULLS LAST,
        v.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_venues_with_next_available TO authenticated, anon;

COMMENT ON FUNCTION public.get_venues_with_next_available IS
  'Returns active venues with their next regular slot_instance (instant/request), filtered by policy and external blocks.';
