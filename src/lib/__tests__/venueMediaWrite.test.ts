import { buildVenueImageRows } from '@/lib/venueMediaWrite'

describe('buildVenueImageRows', () => {
  it('creates stable sort_order values and a single primary image', () => {
    const rows = buildVenueImageRows({
      venueId: 'venue-1',
      photoUrls: [
        'https://example.com/hero.webp',
        'https://example.com/detail-1.webp',
        'https://example.com/detail-2.webp',
      ],
    })

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.sort_order)).toEqual([0, 1, 2])
    expect(rows.filter((row) => row.is_primary)).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      venue_id: 'venue-1',
      public_url: 'https://example.com/hero.webp',
      sort_order: 0,
      is_primary: true,
      media_type: 'image',
      storage_provider: 'supabase',
    })
  })

  it('returns an empty list when no photo urls are provided', () => {
    expect(buildVenueImageRows({ venueId: 'venue-1', photoUrls: [] })).toEqual([])
  })
})
