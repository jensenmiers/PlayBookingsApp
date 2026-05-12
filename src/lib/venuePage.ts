import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deriveVenuePhotos,
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  normalizeVenueMediaRows,
  type VenueWithOptionalMediaFields,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'
import { normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { VenueAdminConfig, VenueMedia } from '@/types'

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

export type VenueMetadataRow = BaseVenueRow & VenueWithOptionalMediaFields & {
  venue_type?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  neighborhood?: string | null
  neighborhood_slug?: string | null
  latitude?: number | null
  longitude?: number | null
  hourly_rate?: number | null
  weekend_rate?: number | null
}

export type VenueSeoMetadata = {
  id: string
  name: string
  description: string | null
  venue_type: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  neighborhood: string | null
  neighborhood_slug: string | null
  latitude: number | null
  longitude: number | null
  hourly_rate: number | null
  weekend_rate: number | null
  primary_photo_url: string | null
}

const VENUE_METADATA_SELECT = [
  'id',
  'name',
  'description',
  'venue_type',
  'address',
  'city',
  'state',
  'zip_code',
  'neighborhood',
  'neighborhood_slug',
  'latitude',
  'longitude',
  'hourly_rate',
  'weekend_rate',
  'photos',
].join(', ')

const VENUE_METADATA_SELECT_NO_NEIGHBORHOOD = [
  'id',
  'name',
  'description',
  'venue_type',
  'address',
  'city',
  'state',
  'zip_code',
  'latitude',
  'longitude',
  'hourly_rate',
  'weekend_rate',
  'photos',
].join(', ')

const VENUE_METADATA_SELECT_WITH_MEDIA = `${VENUE_METADATA_SELECT}, venue_media(public_url, sort_order, is_primary)`
const VENUE_METADATA_SELECT_WITH_MEDIA_NO_NEIGHBORHOOD =
  `${VENUE_METADATA_SELECT_NO_NEIGHBORHOOD}, venue_media(public_url, sort_order, is_primary)`

const VENUE_METADATA_SELECT_ATTEMPTS = [
  VENUE_METADATA_SELECT_WITH_MEDIA,
  VENUE_METADATA_SELECT_WITH_MEDIA_NO_NEIGHBORHOOD,
  VENUE_METADATA_SELECT,
  VENUE_METADATA_SELECT_NO_NEIGHBORHOOD,
] as const

function isPostgresUndefinedColumnError(error: unknown): boolean {
  return (error as { code?: string } | null | undefined)?.code === '42703'
}

function shouldRetryVenueMetadataQuery(error: unknown): boolean {
  return isMissingVenueMediaQueryError(error as { code?: string; message?: string; details?: string })
    || isPostgresUndefinedColumnError(error)
}

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

function pickPrimaryPhotoUrl(media: VenueMedia[] | null | undefined, photos: string[] | null | undefined): string | null {
  const normalizedMedia = normalizeVenueMediaRows(media)
  const primary = normalizedMedia.find((row) => row.is_primary) ?? normalizedMedia[0]
  if (primary) return primary.public_url
  const derived = deriveVenuePhotos({ photos: photos ?? null, media: media ?? null })
  return derived[0] ?? null
}

function toVenueSeoMetadata(row: VenueMetadataRow): VenueSeoMetadata {
  const media = (row.media ?? row.venue_media) as VenueMedia[] | null | undefined
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    venue_type: row.venue_type ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    zip_code: row.zip_code ?? null,
    neighborhood: row.neighborhood ?? null,
    neighborhood_slug: row.neighborhood_slug ?? null,
    latitude: typeof row.latitude === 'number' ? row.latitude : null,
    longitude: typeof row.longitude === 'number' ? row.longitude : null,
    hourly_rate: typeof row.hourly_rate === 'number' ? row.hourly_rate : null,
    weekend_rate: typeof row.weekend_rate === 'number' ? row.weekend_rate : null,
    primary_photo_url: pickPrimaryPhotoUrl(media, row.photos ?? null),
  }
}

export async function findVenueMetadataBySlug(
  supabase: Pick<SupabaseClient, 'from'>,
  slug: string
): Promise<VenueSeoMetadata | null> {
  let rows: VenueMetadataRow[] = []

  for (const clause of VENUE_METADATA_SELECT_ATTEMPTS) {
    try {
      rows = await fetchVenueRows<VenueMetadataRow>(supabase, slug, clause)
      break
    } catch (error) {
      const isLast = clause === VENUE_METADATA_SELECT_ATTEMPTS[VENUE_METADATA_SELECT_ATTEMPTS.length - 1]
      if (isLast || !shouldRetryVenueMetadataQuery(error)) {
        throw error
      }
    }
  }

  const match = rows.find((venue) => slugifyVenueName(venue.name) === slug)
  return match ? toVenueSeoMetadata(match) : null
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

export async function findVenueAdminConfigByVenueId(
  supabase: Pick<SupabaseClient, 'from'>,
  venueId: string
): Promise<VenueAdminConfig> {
  const query = supabase
    .from('venue_admin_configs')
    .select('*')
    .eq('venue_id', venueId)

  const maybeSingle = (
    query as {
      maybeSingle?: () => PromiseLike<{
        data: Partial<VenueAdminConfig> | null
        error: { code?: string; message?: string } | null
      }>
    }
  ).maybeSingle

  const { data, error } = maybeSingle
    ? await maybeSingle.call(query)
    : { data: null, error: null }

  const isMissingConfigTable = error?.code === '42P01'
    || error?.message?.toLowerCase().includes('venue_admin_configs')

  if (error && !isMissingConfigTable) {
    throw error
  }

  return normalizeVenueAdminConfig(venueId, isMissingConfigTable ? null : data)
}
