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

  it('queries metadata by narrowed name pattern and resolves the exact slug match', async () => {
    mockIlike.mockResolvedValue({
      data: [
        { id: '1', name: 'First Presbyterian Church of Hollywood', description: 'Historic gym' },
      ],
      error: null,
    })

    const venue = await findVenueMetadataBySlug(
      supabase as never,
      'first-presbyterian-church-of-hollywood'
    )

    expect(mockFrom).toHaveBeenCalledWith('venues')
    expect(mockSelect).toHaveBeenCalledWith('id, name, description')
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(mockIlike).toHaveBeenCalledWith('name', '%first%presbyterian%church%of%hollywood%')
    expect(venue).toEqual({
      id: '1',
      name: 'First Presbyterian Church of Hollywood',
      description: 'Historic gym',
    })
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
