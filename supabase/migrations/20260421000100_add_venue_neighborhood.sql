-- Adds neighborhood columns to venues so we can build per-location SEO pages
-- (e.g. /los-angeles/basketball-courts/hollywood). Populated by the
-- scripts/backfill-venue-neighborhoods.ts one-off and by future create/edit
-- flows. Nullable so existing rows remain valid until backfill runs.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS neighborhood TEXT;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS neighborhood_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_venues_neighborhood_slug_active
  ON public.venues (neighborhood_slug)
  WHERE is_active = true;

COMMENT ON COLUMN public.venues.neighborhood IS
  'Human-readable LA neighborhood label (e.g. "Hollywood"). Used in titles, meta descriptions, and landing-page H1s.';

COMMENT ON COLUMN public.venues.neighborhood_slug IS
  'URL-safe neighborhood slug (e.g. "hollywood") used to build /los-angeles/basketball-courts/[slug] landing pages.';
