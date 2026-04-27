import { buildVenueNameSearchPattern, findVenueBySlug, findVenueMetadataBySlug } from '@/lib/venuePage'

const mockIlike = jest.fn()
const mockEq = jest.fn(() => ({ ilike: mockIlike }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

describe('venuePage helpers', () => {
  const supabase = {
    from: mockFrom,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds a narrowed ilike pattern from the slug', () => {
    expect(buildVenueNameSearchPattern('first-presbyterian-church-of-hollywood')).toBe(
      '%first%presbyterian%church%of%hollywood%'
    )
  })

  it('retries metadata select without neighborhood columns immediately when Postgres returns 42703', async () => {
    const row = {
      id: '1',
      name: 'First Presbyterian Church of Hollywood',
      description: 'Historic gym',
      venue_type: 'gym',
      address: '1760 N Gower St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90028',
      latitude: 34.1055,
      longitude: -118.3229,
      hourly_rate: 120,
      weekend_rate: 150,
      photos: null,
      venue_media: [
        {
          public_url: 'https://example.com/hero.webp',
          sort_order: 0,
          is_primary: true,
        },
      ],
    }
    const undefinedCol = { code: '42703', message: 'column venues.neighborhood does not exist' }
    mockIlike
      .mockResolvedValueOnce({ data: null, error: undefinedCol })
      .mockResolvedValueOnce({ data: [row], error: null })

    const venue = await findVenueMetadataBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(mockIlike).toHaveBeenCalledTimes(2)
    expect(mockSelect).toHaveBeenNthCalledWith(2, expect.stringContaining('venue_media('))
    expect(mockSelect).toHaveBeenNthCalledWith(2, expect.not.stringContaining('neighborhood'))
    expect(venue).toEqual(
      expect.objectContaining({
        id: '1',
        neighborhood: null,
        neighborhood_slug: null,
        primary_photo_url: 'https://example.com/hero.webp',
      })
    )
  })

  it('queries metadata by narrowed name pattern and resolves the exact slug match', async () => {
    mockIlike.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'First Presbyterian Church of Hollywood',
          description: 'Historic gym',
          venue_type: 'gym',
          address: '1760 N Gower St',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90028',
          neighborhood: 'Hollywood',
          neighborhood_slug: 'hollywood',
          latitude: 34.1055,
          longitude: -118.3229,
          hourly_rate: 120,
          weekend_rate: 150,
          venue_media: [
            {
              public_url: 'https://example.com/hero.webp',
              sort_order: 0,
              is_primary: true,
            },
          ],
        },
      ],
      error: null,
    })

    const venue = await findVenueMetadataBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(mockFrom).toHaveBeenCalledWith('venues')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('photos'))
    expect(mockIlike).toHaveBeenCalledWith('name', '%first%presbyterian%church%of%hollywood%')
    expect(venue).toEqual(
      expect.objectContaining({
        id: '1',
        name: 'First Presbyterian Church of Hollywood',
        description: 'Historic gym',
        neighborhood: 'Hollywood',
        neighborhood_slug: 'hollywood',
        hourly_rate: 120,
        primary_photo_url: 'https://example.com/hero.webp',
      })
    )
  })

  it('returns the normalized venue and media for a matching slug', async () => {
    mockIlike.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'First Presbyterian Church of Hollywood',
          description: 'Historic gym',
          photos: ['https://legacy.example.com/stale.webp'],
          venue_media: [
            {
              id: 'media-2',
              venue_id: '1',
              media_type: 'image',
              storage_provider: 'supabase',
              bucket_name: 'venue-photos',
              object_path: 'venue/detail.webp',
              public_url: 'https://example.com/detail.webp',
              alt_text: null,
              caption: null,
              sort_order: 1,
              is_primary: false,
              mime_type: 'image/webp',
              file_size_bytes: null,
              width_px: null,
              height_px: null,
              migrated_from_legacy_photos: false,
              created_by: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 'media-1',
              venue_id: '1',
              media_type: 'image',
              storage_provider: 'supabase',
              bucket_name: 'venue-photos',
              object_path: 'venue/hero.webp',
              public_url: 'https://example.com/hero.webp',
              alt_text: null,
              caption: null,
              sort_order: 0,
              is_primary: true,
              mime_type: 'image/webp',
              file_size_bytes: null,
              width_px: null,
              height_px: null,
              migrated_from_legacy_photos: false,
              created_by: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        },
      ],
      error: null,
    })

    const venue = await findVenueBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(venue).toEqual(
      expect.objectContaining({
        id: '1',
        name: 'First Presbyterian Church of Hollywood',
        photos: ['https://example.com/hero.webp', 'https://example.com/detail.webp'],
      })
    )
  })


  it('falls back to legacy photos for metadata when venue_media is empty', async () => {
    mockIlike.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'First Presbyterian Church of Hollywood',
          description: 'Historic gym',
          photos: ['https://legacy.example.com/hero.webp'],
          venue_media: [],
        },
      ],
      error: null,
    })

    const venue = await findVenueMetadataBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(venue).toEqual(
      expect.objectContaining({
        primary_photo_url: 'https://legacy.example.com/hero.webp',
      })
    )
  })

  it('returns null when no exact slug match exists inside narrowed results', async () => {
    mockIlike.mockResolvedValue({
      data: [{ id: '2', name: 'First Presbyterian Annex', description: 'Nearby' }],
      error: null,
    })

    const venue = await findVenueBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(venue).toBeNull()
  })
})
