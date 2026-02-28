ALTER TABLE public.venue_admin_configs
  DROP COLUMN IF EXISTS insurance_document_types,
  DROP COLUMN IF EXISTS insurance_requires_manual_approval;
