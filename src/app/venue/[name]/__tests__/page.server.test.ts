// Mock next/navigation - must be before imports
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

jest.mock('@/lib/supabase/public-server', () => ({
  createPublicServerClient: jest.fn(() => ({ from: jest.fn() })),
}))

jest.mock('@/components/venue/venue-design-editorial', () => ({
  VenueDesignEditorial: jest.fn(() => null),
}))

const mockFindVenueMetadataBySlug = jest.fn()
const mockFindVenueBySlug = jest.fn()
const mockFindVenueAdminConfigByVenueId = jest.fn()

jest.mock('@/lib/venuePage', () => ({
  findVenueMetadataBySlug: (...args: unknown[]) => mockFindVenueMetadataBySlug(...args),
  findVenueBySlug: (...args: unknown[]) => mockFindVenueBySlug(...args),
  findVenueAdminConfigByVenueId: (...args: unknown[]) => mockFindVenueAdminConfigByVenueId(...args),
}))

const mockGetAvailableSlots = jest.fn()
const mockAvailabilityServiceCtor = jest.fn()

jest.mock('@/services/availabilityService', () => ({
  AvailabilityService: jest.fn().mockImplementation((options) => {
    mockAvailabilityServiceCtor(options)
    return {
      getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
    }
  }),
}))

// Import after mocks
import { generateMetadata } from '../page'
import VenuePage from '../page'
import { notFound } from 'next/navigation'
import { createPublicServerClient } from '@/lib/supabase/public-server'

const mockNotFound = notFound as jest.MockedFunction<typeof notFound>
const { VenueDesignEditorial: mockVenueDesignEditorial } = jest.requireMock(
  '@/components/venue/venue-design-editorial'
) as { VenueDesignEditorial: jest.Mock }

function findVenueDesignEditorial(node: unknown): { type: unknown; props: Record<string, unknown> } {
  const visit = (n: unknown): { type: unknown; props: Record<string, unknown> } | null => {
    if (!n || typeof n !== 'object') return null
    const el = n as { type?: unknown; props?: { children?: unknown } }
    if (el.type === mockVenueDesignEditorial) {
      return el as { type: unknown; props: Record<string, unknown> }
    }
    const children = el.props?.children
    if (Array.isArray(children)) {
      for (const child of children) {
        const found = visit(child)
        if (found) return found
      }
    } else if (children) {
      const found = visit(children)
      if (found) return found
    }
    return null
  }
  const found = visit(node)
  if (!found) throw new Error('VenueDesignEditorial element not found in render tree')
  return found
}

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a keyword-rich title and canonical path for a valid venue slug', async () => {
    mockFindVenueMetadataBySlug.mockResolvedValue({
      id: 'venue-1',
      name: 'Test Basketball Court',
      description: 'A great court',
      venue_type: 'court',
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90028',
      neighborhood: 'Hollywood',
      neighborhood_slug: 'hollywood',
      latitude: 34.1,
      longitude: -118.33,
      hourly_rate: 75,
      weekend_rate: null,
      primary_photo_url: 'https://example.com/hero.jpg',
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(metadata.title).toBe('Book Test Basketball Court — Indoor Basketball Court in Hollywood, LA — $75/hr')
    expect(metadata.alternates?.canonical).toBe('/venue/test-basketball-court')
    expect(typeof metadata.description).toBe('string')
  })

  it('returns "Venue Not Found" for invalid slug', async () => {
    mockFindVenueMetadataBySlug.mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'non-existent-venue' }),
    })

    expect(metadata.title).toBe('Venue Not Found')
    expect(metadata.description).toBe('Book venues on PlayBookings')
  })

  it('handles empty venues list', async () => {
    mockFindVenueMetadataBySlug.mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'any-slug' }),
    })

    expect(metadata.title).toBe('Venue Not Found')
  })
})

describe('VenuePage', () => {
  const venueRecord = {
    id: '123',
    name: 'Test Basketball Court',
    description: 'Description',
    address: '123 Main St',
    city: 'LA',
    state: 'CA',
    zip_code: '90001',
    owner_id: 'owner-1',
    hourly_rate: 50,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAvailableSlots.mockResolvedValue([])
    mockFindVenueAdminConfigByVenueId.mockResolvedValue({
      venue_id: '123',
      min_advance_booking_days: 0,
      min_advance_lead_time_hours: 0,
    })
  })

  it('calls notFound() when venue does not exist', async () => {
    mockFindVenueBySlug.mockResolvedValue(null)

    await expect(
      VenuePage({ params: Promise.resolve({ name: 'non-existent-slug' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('does not call notFound() when venue exists', async () => {
    mockFindVenueBySlug.mockResolvedValue(venueRecord)

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(findVenueDesignEditorial(result).type).toBe(mockVenueDesignEditorial)
  })

  it('renders the canonical venue page without variant photo affordance props', async () => {
    mockFindVenueBySlug.mockResolvedValue(venueRecord)

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    const editorial = findVenueDesignEditorial(result)
    expect(editorial.props).not.toHaveProperty('photoAffordance')
    expect(editorial.props.faqStyle).toBe('accordion')
    expect(editorial.props.bottomGallery).toBe('strip')
  })

  it('normalizes venue media into ordered photos before rendering the venue page', async () => {
    mockFindVenueBySlug.mockResolvedValue({
      ...venueRecord,
      photos: ['https://example.com/hero.webp', 'https://example.com/detail.webp'],
      media: [
        { public_url: 'https://example.com/hero.webp' },
      ],
    })

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    const editorial = findVenueDesignEditorial(result)
    expect(editorial.props.venue).toEqual(
      expect.objectContaining({
        media: expect.arrayContaining([
          expect.objectContaining({ public_url: 'https://example.com/hero.webp' }),
        ]),
        photos: [
          'https://example.com/hero.webp',
          'https://example.com/detail.webp',
        ],
      })
    )
  })

  it('passes the public venue policy into the venue page component', async () => {
    mockFindVenueBySlug.mockResolvedValue(venueRecord)
    mockFindVenueAdminConfigByVenueId.mockResolvedValue({
      venue_id: '123',
      min_advance_booking_days: 1,
      min_advance_lead_time_hours: 24,
    })

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    const editorial = findVenueDesignEditorial(result)
    expect(mockFindVenueAdminConfigByVenueId).toHaveBeenCalledWith(expect.anything(), '123')
    expect(editorial.props.venueAdminConfig).toEqual(
      expect.objectContaining({
        min_advance_booking_days: 1,
        min_advance_lead_time_hours: 24,
      })
    )
  })

  it('reuses the same server Supabase client for venue lookup and initial availability', async () => {
    const sharedClient = { from: jest.fn() }
    ;(createPublicServerClient as jest.Mock).mockReturnValue(sharedClient)
    mockFindVenueBySlug.mockResolvedValue(venueRecord)
    mockGetAvailableSlots.mockResolvedValue([])

    await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    const ctorArgs = mockAvailabilityServiceCtor.mock.calls[0]?.[0] as {
      getClient: () => Promise<unknown>
    }
    expect(ctorArgs).toBeDefined()
    await expect(ctorArgs.getClient()).resolves.toBe(sharedClient)
  })

  it('passes server-rendered initial availability into the venue page component', async () => {
    mockFindVenueBySlug.mockResolvedValue(venueRecord)
    mockGetAvailableSlots.mockResolvedValue([
      {
        date: '2026-04-13',
        start_time: '18:00:00',
        end_time: '19:00:00',
        venue_id: '123',
        action_type: 'request_private',
      },
    ])

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    const editorial = findVenueDesignEditorial(result)
    expect(editorial.props.initialAvailability).toEqual([
      expect.objectContaining({
        date: '2026-04-13',
        start_time: '18:00:00',
      }),
    ])
  })

  it('renders the venue page with empty initial availability when SSR availability loading fails', async () => {
    mockFindVenueBySlug.mockResolvedValue(venueRecord)
    mockGetAvailableSlots.mockRejectedValue(new Error('Availability RPC failed'))
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(result).toBeDefined()
    const editorial = findVenueDesignEditorial(result)
    expect(editorial.props.initialAvailability).toEqual([])
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to load initial venue availability during SSR:',
      expect.objectContaining({
        slug: 'test-basketball-court',
        venueId: '123',
      })
    )
    expect(mockNotFound).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
