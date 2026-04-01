import type { VenueMedia } from '@/types'

export const VENUE_MEDIA_SELECT_COLUMNS = [
  'id',
  'venue_id',
  'media_type',
  'storage_provider',
  'bucket_name',
  'object_path',
  'public_url',
  'alt_text',
  'caption',
  'sort_order',
  'is_primary',
  'mime_type',
  'file_size_bytes',
  'width_px',
  'height_px',
  'migrated_from_legacy_photos',
  'created_by',
  'created_at',
  'updated_at',
].join(', ')

export const VENUE_SELECT_WITH_MEDIA = `*, venue_media(${VENUE_MEDIA_SELECT_COLUMNS})`

export function isMissingVenueMediaQueryError(error: {
  code?: string
  message?: string
  details?: string
} | null | undefined): boolean {
  if (!error) {
    return false
  }

  const details = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()

  return error.code === '42P01'
    || error.code === 'PGRST200'
    || (details.includes('venue_media') && (
      details.includes('relationship')
      || details.includes('schema cache')
      || details.includes('does not exist')
    ))
}

export type VenueWithOptionalMediaFields = {
  photos?: string[] | null
  media?: VenueMedia[] | null
  venue_media?: VenueMedia[] | null
}

type MediaBearingRecord = VenueWithOptionalMediaFields

function normalizeLegacyPhotos(photos: string[] | null | undefined): string[] {
  if (!Array.isArray(photos)) {
    return []
  }

  return photos.filter((photo): photo is string => typeof photo === 'string' && photo.length > 0)
}

export function normalizeVenueMediaRows(rows: VenueMedia[] | null | undefined): VenueMedia[] {
  if (!Array.isArray(rows)) {
    return []
  }

  return [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }

    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1
    }

    return left.public_url.localeCompare(right.public_url)
  })
}

export function deriveVenuePhotos(record: MediaBearingRecord): string[] {
  const media = normalizeVenueMediaRows(record.media ?? record.venue_media)
  if (media.length > 0) {
    return media.map((row) => row.public_url)
  }

  return normalizeLegacyPhotos(record.photos)
}

export function normalizeVenueWithMedia<T extends MediaBearingRecord>(record: T): T & {
  media: VenueMedia[]
  photos: string[]
} {
  const media = normalizeVenueMediaRows(record.media ?? record.venue_media)
  const photos = media.length > 0
    ? media.map((row) => row.public_url)
    : normalizeLegacyPhotos(record.photos)

  return {
    ...record,
    media,
    photos,
  }
}

export function normalizeVenueCollectionWithMedia<T extends MediaBearingRecord>(
  rows: T[] | null | undefined
): Array<T & { media: VenueMedia[]; photos: string[] }> {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.map((row) => normalizeVenueWithMedia(row))
}
