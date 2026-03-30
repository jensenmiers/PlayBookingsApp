-- Normalize legacy venues.photos into a dedicated venue_media table.
-- v1 remains image-only, but the table is shaped to expand cleanly later.

CREATE TABLE IF NOT EXISTS public.venue_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image')),
  storage_provider TEXT NOT NULL DEFAULT 'supabase' CHECK (storage_provider IN ('supabase')),
  bucket_name TEXT NULL,
  object_path TEXT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT NULL,
  caption TEXT NULL,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  mime_type TEXT NULL,
  file_size_bytes BIGINT NULL CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  width_px INTEGER NULL CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER NULL CHECK (height_px IS NULL OR height_px > 0),
  migrated_from_legacy_photos BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_media_unique_sort_order UNIQUE (venue_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_venue_media_venue_id
  ON public.venue_media (venue_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_media_single_primary
  ON public.venue_media (venue_id)
  WHERE is_primary = true;

COMMENT ON TABLE public.venue_media IS
  'Canonical ordered media rows for venue listings. v1 is image-only.';

COMMENT ON COLUMN public.venue_media.object_path IS
  'Provider-relative object key, when derivable from the public URL.';

COMMENT ON COLUMN public.venue_media.public_url IS
  'Resolved public URL used by the current renter-facing image experiences.';

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_venue_media_updated_at ON public.venue_media;
CREATE TRIGGER set_venue_media_updated_at
  BEFORE UPDATE ON public.venue_media
  FOR EACH ROW
  EXECUTE FUNCTION public.set_row_updated_at();

ALTER TABLE public.venue_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view venue media" ON public.venue_media;
CREATE POLICY "Public can view venue media"
  ON public.venue_media
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.venues v
      WHERE v.id = venue_media.venue_id
        AND v.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage venue media" ON public.venue_media;
CREATE POLICY "Admins can manage venue media"
  ON public.venue_media
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

DO $$
DECLARE
  photos_type TEXT;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
  INTO photos_type
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'venues'
    AND a.attname = 'photos'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF photos_type IS NULL THEN
    RAISE EXCEPTION 'public.venues.photos column not found';
  END IF;

  IF photos_type = 'text[]' THEN
    INSERT INTO public.venue_media (
      venue_id,
      media_type,
      storage_provider,
      bucket_name,
      object_path,
      public_url,
      sort_order,
      is_primary,
      migrated_from_legacy_photos
    )
    SELECT
      v.id,
      'image',
      'supabase',
      COALESCE((regexp_match(photo_url, '/storage/v1/object/public/([^/]+)/(.+)$'))[1], 'venue-photos'),
      (regexp_match(photo_url, '/storage/v1/object/public/([^/]+)/(.+)$'))[2],
      photo_url,
      ordinality - 1,
      ordinality = 1,
      true
    FROM public.venues v
    CROSS JOIN LATERAL unnest(COALESCE(v.photos, ARRAY[]::text[])) WITH ORDINALITY AS p(photo_url, ordinality)
    ON CONFLICT (venue_id, sort_order)
    DO UPDATE SET
      public_url = EXCLUDED.public_url,
      bucket_name = EXCLUDED.bucket_name,
      object_path = EXCLUDED.object_path,
      is_primary = EXCLUDED.is_primary,
      migrated_from_legacy_photos = EXCLUDED.migrated_from_legacy_photos,
      updated_at = NOW();
  ELSIF photos_type = 'jsonb' THEN
    INSERT INTO public.venue_media (
      venue_id,
      media_type,
      storage_provider,
      bucket_name,
      object_path,
      public_url,
      sort_order,
      is_primary,
      migrated_from_legacy_photos
    )
    SELECT
      v.id,
      'image',
      'supabase',
      COALESCE((regexp_match(photo_url, '/storage/v1/object/public/([^/]+)/(.+)$'))[1], 'venue-photos'),
      (regexp_match(photo_url, '/storage/v1/object/public/([^/]+)/(.+)$'))[2],
      photo_url,
      ordinality - 1,
      ordinality = 1,
      true
    FROM public.venues v
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(v.photos, '[]'::jsonb)) WITH ORDINALITY AS p(photo_url, ordinality)
    ON CONFLICT (venue_id, sort_order)
    DO UPDATE SET
      public_url = EXCLUDED.public_url,
      bucket_name = EXCLUDED.bucket_name,
      object_path = EXCLUDED.object_path,
      is_primary = EXCLUDED.is_primary,
      migrated_from_legacy_photos = EXCLUDED.migrated_from_legacy_photos,
      updated_at = NOW();
  ELSE
    RAISE EXCEPTION 'Unsupported public.venues.photos type: %', photos_type;
  END IF;
END;
$$;
