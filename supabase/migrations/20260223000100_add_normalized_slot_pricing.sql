-- Normalized slot pricing model for slot-based availability.
-- Supports action-type pricing (e.g., open gym drop-in) with per-instance snapshots.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'pricing_unit'
  ) THEN
    CREATE TYPE public.pricing_unit AS ENUM ('hour', 'person', 'session');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'payment_method_type'
  ) THEN
    CREATE TYPE public.payment_method_type AS ENUM ('in_app', 'on_site');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  action_type public.slot_action_type NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  unit public.pricing_unit NOT NULL,
  payment_method public.payment_method_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_rules_unique_rule UNIQUE (
    venue_id,
    action_type,
    amount_cents,
    currency,
    unit,
    payment_method
  )
);

ALTER TABLE public.slot_templates
  ADD COLUMN IF NOT EXISTS pricing_rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.slot_instance_pricing (
  slot_instance_id UUID PRIMARY KEY REFERENCES public.slot_instances(id) ON DELETE CASCADE,
  pricing_rule_id UUID REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  unit public.pricing_unit NOT NULL,
  payment_method public.payment_method_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_venue_action
  ON public.pricing_rules (venue_id, action_type)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_slot_templates_pricing_rule
  ON public.slot_templates (pricing_rule_id)
  WHERE pricing_rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slot_instance_pricing_rule
  ON public.slot_instance_pricing (pricing_rule_id)
  WHERE pricing_rule_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_pricing_rules_updated_at ON public.pricing_rules;
CREATE TRIGGER set_pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_instance_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active pricing rules"
  ON public.pricing_rules
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.venues v
      WHERE v.id = pricing_rules.venue_id
        AND v.is_active = true
    )
  );

CREATE POLICY "Public can view slot instance pricing"
  ON public.slot_instance_pricing
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.slot_instances si
      JOIN public.venues v ON v.id = si.venue_id
      WHERE si.id = slot_instance_pricing.slot_instance_id
        AND si.is_active = true
        AND v.is_active = true
    )
  );

CREATE POLICY "Admins can manage pricing rules"
  ON public.pricing_rules
  FOR ALL
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

CREATE POLICY "Admins can manage slot instance pricing"
  ON public.slot_instance_pricing
  FOR ALL
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

  INSERT INTO public.slot_instance_pricing (
    slot_instance_id,
    pricing_rule_id,
    amount_cents,
    currency,
    unit,
    payment_method
  )
  SELECT
    si.id,
    pr.id,
    pr.amount_cents,
    pr.currency,
    pr.unit,
    pr.payment_method
  FROM public.slot_instances si
  JOIN public.slot_templates st ON st.id = si.template_id
  JOIN public.pricing_rules pr ON pr.id = st.pricing_rule_id
  WHERE (p_venue_id IS NULL OR si.venue_id = p_venue_id)
    AND si.date BETWEEN p_date_from AND p_date_to
  ON CONFLICT (slot_instance_id)
  DO UPDATE SET
    pricing_rule_id = EXCLUDED.pricing_rule_id,
    amount_cents = EXCLUDED.amount_cents,
    currency = EXCLUDED.currency,
    unit = EXCLUDED.unit,
    payment_method = EXCLUDED.payment_method;

  DELETE FROM public.slot_instance_pricing sip
  USING public.slot_instances si
  WHERE sip.slot_instance_id = si.id
    AND (p_venue_id IS NULL OR si.venue_id = p_venue_id)
    AND si.date BETWEEN p_date_from AND p_date_to
    AND NOT EXISTS (
      SELECT 1
      FROM public.slot_templates st
      JOIN public.pricing_rules pr ON pr.id = st.pricing_rule_id
      WHERE st.id = si.template_id
    );

  RETURN rows_written;
END;
$$;

DO $$
DECLARE
  memorial_venue_id UUID;
  memorial_open_gym_pricing_rule_id UUID;
BEGIN
  SELECT id
  INTO memorial_venue_id
  FROM public.venues
  WHERE name = 'Memorial Park'
  LIMIT 1;

  IF memorial_venue_id IS NULL THEN
    RAISE NOTICE 'Memorial Park venue not found; skipping pricing seed';
    RETURN;
  END IF;

  SELECT id
  INTO memorial_open_gym_pricing_rule_id
  FROM public.pricing_rules
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym'
    AND unit = 'person'
    AND payment_method = 'on_site'
    AND currency = 'USD'
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF memorial_open_gym_pricing_rule_id IS NULL THEN
    INSERT INTO public.pricing_rules (
      venue_id,
      action_type,
      amount_cents,
      currency,
      unit,
      payment_method,
      is_active
    ) VALUES (
      memorial_venue_id,
      'info_only_open_gym',
      500,
      'USD',
      'person',
      'on_site',
      true
    )
    RETURNING id INTO memorial_open_gym_pricing_rule_id;
  END IF;

  UPDATE public.slot_templates
  SET pricing_rule_id = memorial_open_gym_pricing_rule_id
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym';

  PERFORM public.refresh_slot_instances_from_templates(
    memorial_venue_id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '365 days')::date
  );
END
$$;
