import {
  deriveVenuePhotos,
  normalizeVenueMediaRows,
  normalizeVenueWithMedia,
} from '@/lib/venueMedia'
import type { VenueMedia } from '@/types'

function createMedia(overrides: Partial<VenueMedia> = {}): VenueMedia {
  return {
    id: 'media-1',
    venue_id: 'venue-1',
    media_type: 'image',
    storage_provider: 'supabase',
    bucket_name: 'venue-photos',
    object_path: 'venue-1/hero.webp',
    public_url: 'https://example.com/hero.webp',
    alt_text: null,
    caption: null,
    sort_order: 0,
    is_primary: true,
    mime_type: 'image/webp',
    file_size_bytes: 1024,
    width_px: 1600,
    height_px: 900,
    migrated_from_legacy_photos: false,
    created_by: null,
    created_at: '2026-03-30T00:00:00.000Z',
    updated_at: '2026-03-30T00:00:00.000Z',
    ...overrides,
  }
}

describe('venueMedia helpers', () => {
  it('does not throw when public_url is null at the URL tie-breaker', () => {
    const m1 = createMedia({
      id: 'media-1',
      sort_order: 0,
      is_primary: true,
      public_url: 'https://example.com/a.webp',
    })
    const m2: VenueMedia = {
      ...createMedia({
        id: 'media-2',
        sort_order: 0,
        is_primary: true,
        public_url: 'https://example.com/b.webp',
      }),
      public_url: null as unknown as string,
    }

    expect(() => normalizeVenueMediaRows([m1, m2])).not.toThrow()
  })

  it('sorts media rows by sort_order', () => {
    const rows = normalizeVenueMediaRows([
      createMedia({
        id: 'media-2',
        sort_order: 2,
        is_primary: false,
        public_url: 'https://example.com/2.webp',
      }),
      createMedia({
        id: 'media-1',
        sort_order: 0,
        is_primary: true,
        public_url: 'https://example.com/0.webp',
      }),
      createMedia({
        id: 'media-3',
        sort_order: 1,
        is_primary: false,
        public_url: 'https://example.com/1.webp',
      }),
    ])

    expect(rows.map((row) => row.public_url)).toEqual([
      'https://example.com/0.webp',
      'https://example.com/1.webp',
      'https://example.com/2.webp',
    ])
  })

  it('derives photos from ordered media rows', () => {
    const photos = deriveVenuePhotos({
      photos: ['https://legacy.example.com/fallback.webp'],
      media: [
        createMedia({ sort_order: 1, is_primary: false, public_url: 'https://example.com/1.webp' }),
        createMedia({ sort_order: 0, is_primary: true, public_url: 'https://example.com/0.webp' }),
      ],
    })

    expect(photos).toEqual([
      'https://example.com/0.webp',
      'https://example.com/1.webp',
    ])
  })

  it('falls back to legacy photos when media rows are absent', () => {
    expect(
      deriveVenuePhotos({
        photos: ['https://legacy.example.com/hero.webp', 'https://legacy.example.com/detail.webp'],
        media: [],
      })
    ).toEqual([
      'https://legacy.example.com/hero.webp',
      'https://legacy.example.com/detail.webp',
    ])
  })

  it('prefers venue_media relation data over legacy photos when both are present', () => {
    const venue = normalizeVenueWithMedia({
      id: 'venue-1',
      name: 'Memorial Park',
      photos: ['https://legacy.example.com/stale.webp'],
      venue_media: [
        createMedia({
          id: 'media-2',
          sort_order: 1,
          is_primary: false,
          public_url: 'https://example.com/detail.webp',
        }),
        createMedia({
          id: 'media-1',
          sort_order: 0,
          is_primary: true,
          public_url: 'https://example.com/hero.webp',
        }),
      ],
    })

    expect(venue.photos).toEqual([
      'https://example.com/hero.webp',
      'https://example.com/detail.webp',
    ])
    expect(venue.media.map((row) => row.public_url)).toEqual([
      'https://example.com/hero.webp',
      'https://example.com/detail.webp',
    ])
  })
})
