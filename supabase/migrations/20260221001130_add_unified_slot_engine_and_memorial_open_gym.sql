-- Unified slot engine for instant, request, and info-only slot types.
-- Includes template-driven slot instance generation and Memorial Park open-gym seed data.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'slot_action_type'
  ) THEN
    CREATE TYPE public.slot_action_type AS ENUM (
      'instant_book',
      'request_private',
      'info_only_open_gym'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.slot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  action_type public.slot_action_type NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_interval_minutes SMALLINT NOT NULL DEFAULT 60 CHECK (slot_interval_minutes > 0 AND slot_interval_minutes <= 240),
  blocks_inventory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_templates_valid_time_range CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS public.slot_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.slot_templates(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  action_type public.slot_action_type NOT NULL,
  blocks_inventory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source_availability_id UUID REFERENCES public.availability(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_instances_valid_time_range CHECK (start_time < end_time),
  CONSTRAINT slot_instances_unique_slot UNIQUE (venue_id, date, start_time, end_time, action_type)
);

CREATE TABLE IF NOT EXISTS public.slot_modal_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  action_type public.slot_action_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  bullet_points TEXT[] NOT NULL DEFAULT '{}'::text[],
  cta_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_modal_content_unique UNIQUE (venue_id, action_type)
);

CREATE TABLE IF NOT EXISTS public.slot_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_instance_id UUID REFERENCES public.slot_instances(id) ON DELETE SET NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('slot_click', 'modal_open', 'modal_close', 'modal_cta')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slot_templates_venue_day
  ON public.slot_templates (venue_id, day_of_week)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_slot_instances_venue_date_time
  ON public.slot_instances (venue_id, date, start_time)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_slot_instances_action_type
  ON public.slot_instances (action_type);

CREATE INDEX IF NOT EXISTS idx_slot_interactions_created_at
  ON public.slot_interactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slot_interactions_slot_instance_id
  ON public.slot_interactions (slot_instance_id);

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_slot_templates_updated_at ON public.slot_templates;
CREATE TRIGGER set_slot_templates_updated_at
  BEFORE UPDATE ON public.slot_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_slot_instances_updated_at ON public.slot_instances;
CREATE TRIGGER set_slot_instances_updated_at
  BEFORE UPDATE ON public.slot_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_slot_modal_content_updated_at ON public.slot_modal_content;
CREATE TRIGGER set_slot_modal_content_updated_at
  BEFORE UPDATE ON public.slot_modal_content
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.slot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_modal_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active slot templates"
  ON public.slot_templates
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = slot_templates.venue_id
        AND v.is_active = true
    )
  );

CREATE POLICY "Public can view active slot instances"
  ON public.slot_instances
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = slot_instances.venue_id
        AND v.is_active = true
    )
  );

CREATE POLICY "Public can view slot modal content"
  ON public.slot_modal_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = slot_modal_content.venue_id
        AND v.is_active = true
    )
  );

CREATE POLICY "Public can insert slot interactions"
  ON public.slot_interactions
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = slot_interactions.venue_id
        AND v.is_active = true
    )
  );

CREATE POLICY "Users can view own slot interactions"
  ON public.slot_interactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage slot templates"
  ON public.slot_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  );

CREATE POLICY "Admins can manage slot instances"
  ON public.slot_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  );

CREATE POLICY "Admins can manage slot modal content"
  ON public.slot_modal_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  );

CREATE POLICY "Admins can view all slot interactions"
  ON public.slot_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_admin = true
    )
  );

CREATE OR REPLACE FUNCTION public.refresh_slot_instances_from_templates(
  p_venue_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rows_written INTEGER := 0;
BEGIN
  IF p_date_to < p_date_from THEN
    RAISE EXCEPTION 'p_date_to must be greater than or equal to p_date_from';
  END IF;

  DELETE FROM public.slot_instances si
  USING public.slot_templates st
  WHERE si.template_id = st.id
    AND (p_venue_id IS NULL OR st.venue_id = p_venue_id)
    AND si.date BETWEEN p_date_from AND p_date_to;

  INSERT INTO public.slot_instances (
    venue_id,
    template_id,
    date,
    start_time,
    end_time,
    action_type,
    blocks_inventory,
    is_active,
    metadata
  )
  SELECT
    st.venue_id,
    st.id,
    dd.slot_date,
    gs.slot_start::time,
    (gs.slot_start + make_interval(mins => st.slot_interval_minutes))::time,
    st.action_type,
    st.blocks_inventory,
    st.is_active,
    st.metadata
  FROM public.slot_templates st
  CROSS JOIN LATERAL (
    SELECT d::date AS slot_date
    FROM generate_series(p_date_from, p_date_to, interval '1 day') AS d
    WHERE EXTRACT(DOW FROM d)::smallint = st.day_of_week
  ) AS dd
  CROSS JOIN LATERAL (
    SELECT t AS slot_start
    FROM generate_series(
      dd.slot_date + st.start_time,
      dd.slot_date + st.end_time - make_interval(mins => st.slot_interval_minutes),
      make_interval(mins => st.slot_interval_minutes)
    ) AS t
  ) AS gs
  WHERE st.is_active = true
    AND (p_venue_id IS NULL OR st.venue_id = p_venue_id)
  ON CONFLICT (venue_id, date, start_time, end_time, action_type)
  DO UPDATE SET
    template_id = EXCLUDED.template_id,
    blocks_inventory = EXCLUDED.blocks_inventory,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  GET DIAGNOSTICS rows_written = ROW_COUNT;
  RETURN rows_written;
END;
$$;

DO $$
DECLARE
  memorial_venue_id UUID;
BEGIN
  SELECT id
  INTO memorial_venue_id
  FROM public.venues
  WHERE name = 'Memorial Park'
  LIMIT 1;

  IF memorial_venue_id IS NULL THEN
    RAISE NOTICE 'Memorial Park venue not found; skipping slot seed';
    RETURN;
  END IF;

  -- Requested by product: remove legacy availability for Memorial Park.
  DELETE FROM public.availability
  WHERE venue_id = memorial_venue_id;

  -- Reset prior slot configuration for this venue to keep migration idempotent.
  DELETE FROM public.slot_instances
  WHERE venue_id = memorial_venue_id;

  DELETE FROM public.slot_templates
  WHERE venue_id = memorial_venue_id;

  DELETE FROM public.slot_modal_content
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym';

  INSERT INTO public.slot_modal_content (
    venue_id,
    action_type,
    title,
    body,
    bullet_points,
    cta_label
  ) VALUES (
    memorial_venue_id,
    'info_only_open_gym',
    'Open Gym Session',
    'This session is a drop-in open gym. Payment is done on site.',
    ARRAY[
      'No reservation is required for this slot.',
      'Check in with gym staff when you arrive.',
      'Court activity is basketball only during these hours.'
    ],
    'Got it'
  );

  -- Monday, Tuesday, Thursday: 12:00-15:00 and 17:00-19:00
  INSERT INTO public.slot_templates (venue_id, name, action_type, day_of_week, start_time, end_time, slot_interval_minutes, blocks_inventory, is_active)
  VALUES
    (memorial_venue_id, 'Memorial Open Gym Midday', 'info_only_open_gym', 1, '12:00:00', '15:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Evening', 'info_only_open_gym', 1, '17:00:00', '19:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Midday', 'info_only_open_gym', 2, '12:00:00', '15:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Evening', 'info_only_open_gym', 2, '17:00:00', '19:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Midday', 'info_only_open_gym', 4, '12:00:00', '15:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Evening', 'info_only_open_gym', 4, '17:00:00', '19:00:00', 60, true, true);

  -- Wednesday, Friday: 12:00-15:00 and 17:00-21:00
  INSERT INTO public.slot_templates (venue_id, name, action_type, day_of_week, start_time, end_time, slot_interval_minutes, blocks_inventory, is_active)
  VALUES
    (memorial_venue_id, 'Memorial Open Gym Midday', 'info_only_open_gym', 3, '12:00:00', '15:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Evening', 'info_only_open_gym', 3, '17:00:00', '21:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Midday', 'info_only_open_gym', 5, '12:00:00', '15:00:00', 60, true, true),
    (memorial_venue_id, 'Memorial Open Gym Evening', 'info_only_open_gym', 5, '17:00:00', '21:00:00', 60, true, true);

  -- Saturday: 12:00-17:00
  INSERT INTO public.slot_templates (venue_id, name, action_type, day_of_week, start_time, end_time, slot_interval_minutes, blocks_inventory, is_active)
  VALUES
    (memorial_venue_id, 'Memorial Open Gym Weekend', 'info_only_open_gym', 6, '12:00:00', '17:00:00', 60, true, true);

  -- Materialize one year of slots for immediate UX support.
  PERFORM public.refresh_slot_instances_from_templates(
    memorial_venue_id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '365 days')::date
  );
END
$$;
