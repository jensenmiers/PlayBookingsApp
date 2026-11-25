-- Update Memorial Park open-gym drop-in pricing to $3/person.
-- Keep venue_admin_configs and normalized slot pricing aligned so public
-- availability and regenerated slot pricing snapshots agree.

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
    RAISE NOTICE 'Memorial Park venue not found; skipping open-gym price update';
    RETURN;
  END IF;

  INSERT INTO public.venue_admin_configs (
    venue_id,
    drop_in_enabled,
    drop_in_price,
    regular_schedule_mode
  ) VALUES (
    memorial_venue_id,
    true,
    3,
    'template'
  )
  ON CONFLICT (venue_id)
  DO UPDATE SET
    drop_in_enabled = true,
    drop_in_price = 3,
    regular_schedule_mode = 'template',
    updated_at = now();

  SELECT id
  INTO memorial_open_gym_pricing_rule_id
  FROM public.pricing_rules
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym'
    AND amount_cents = 300
    AND currency = 'USD'
    AND unit = 'person'
    AND payment_method = 'on_site'
  ORDER BY is_active DESC, created_at DESC
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
      300,
      'USD',
      'person',
      'on_site',
      true
    )
    RETURNING id INTO memorial_open_gym_pricing_rule_id;
  ELSE
    UPDATE public.pricing_rules
    SET
      is_active = true,
      updated_at = now()
    WHERE id = memorial_open_gym_pricing_rule_id;
  END IF;

  UPDATE public.pricing_rules
  SET
    is_active = false,
    updated_at = now()
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym'
    AND unit = 'person'
    AND payment_method = 'on_site'
    AND currency = 'USD'
    AND amount_cents <> 300
    AND is_active = true;

  UPDATE public.slot_templates
  SET
    pricing_rule_id = memorial_open_gym_pricing_rule_id,
    updated_at = now()
  WHERE venue_id = memorial_venue_id
    AND action_type = 'info_only_open_gym';

  UPDATE public.slot_instance_pricing sip
  SET
    pricing_rule_id = memorial_open_gym_pricing_rule_id,
    amount_cents = 300,
    currency = 'USD',
    unit = 'person',
    payment_method = 'on_site'
  FROM public.slot_instances si
  WHERE sip.slot_instance_id = si.id
    AND si.venue_id = memorial_venue_id
    AND si.action_type = 'info_only_open_gym';

  PERFORM public.refresh_slot_instances_from_templates(
    memorial_venue_id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '365 days')::date
  );
END
$$;
