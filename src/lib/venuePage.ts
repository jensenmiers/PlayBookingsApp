import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  type VenueWithOptionalMediaFields,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'

export function slugifyVenueName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function buildVenueNameSearchPattern(slug: string): string {
  const tokens = slug.split('-').filter(Boolean)
  return `%${tokens.join('%')}%`
}

type BaseVenueRow = {
  id: string
  name: string
  description?: string | null
}

type MetadataVenueRow = BaseVenueRow

type FullVenueRow = BaseVenueRow & VenueWithOptionalMediaFields

async function fetchVenueRows<T extends BaseVenueRow>(
  supabase: Pick<SupabaseClient, 'from'>,
  slug: string,
  selectClause: string
): Promise<T[]> {
  const pattern = buildVenueNameSearchPattern(slug)
  const { data, error } = await supabase
    .from('venues')
    .select(selectClause)
    .eq('is_active', true)
    .ilike('name', pattern)

  if (error) {
    throw error
  }

  return (data || []) as unknown as T[]
}

export async function findVenueMetadataBySlug(
  supabase: Pick<SupabaseClient, 'from'>,
  slug: string
): Promise<MetadataVenueRow | null> {
  const rows = await fetchVenueRows<MetadataVenueRow>(supabase, slug, 'id, name, description')
  return rows.find((venue) => slugifyVenueName(venue.name) === slug) || null
}

export async function findVenueBySlug(
  supabase: Pick<SupabaseClient, 'from'>,
  slug: string
) {
  let rows: FullVenueRow[]

  try {
    rows = await fetchVenueRows<FullVenueRow>(supabase, slug, VENUE_SELECT_WITH_MEDIA)
  } catch (error) {
    if (!isMissingVenueMediaQueryError(error as { code?: string; message?: string; details?: string })) {
      throw error
    }

    rows = await fetchVenueRows<FullVenueRow>(supabase, slug, '*')
  }

  return normalizeVenueCollectionWithMedia(rows).find((venue) => slugifyVenueName(venue.name) === slug) || null
}
