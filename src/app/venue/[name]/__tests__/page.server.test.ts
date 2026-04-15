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

jest.mock('@/lib/venuePage', () => ({
  findVenueMetadataBySlug: (...args: unknown[]) => mockFindVenueMetadataBySlug(...args),
  findVenueBySlug: (...args: unknown[]) => mockFindVenueBySlug(...args),
}))

const mockGetAvailableSlots = jest.fn()

jest.mock('@/services/availabilityService', () => ({
  AvailabilityService: jest.fn().mockImplementation(() => ({
    getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
  })),
}))

// Import after mocks
import { generateMetadata } from '../page'
import VenuePage from '../page'
import { notFound } from 'next/navigation'

const mockNotFound = notFound as jest.MockedFunction<typeof notFound>
const { VenueDesignEditorial: mockVenueDesignEditorial } = jest.requireMock(
  '@/components/venue/venue-design-editorial'
) as { VenueDesignEditorial: jest.Mock }

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns venue name in title for valid venue slug', async () => {
    mockFindVenueMetadataBySlug.mockResolvedValue({
      id: 'venue-1',
      name: 'Test Basketball Court',
      description: 'A great court',
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(metadata.title).toBe('Test Basketball Court | PlayBookings')
    expect(metadata.description).toBe('A great court')
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
    expect((result as { type: unknown }).type).toBe(mockVenueDesignEditorial)
    expect(result).toBeDefined()
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

    expect((result as { props: { venue: { media: Array<{ public_url: string }>; photos: string[] } } }).props.venue).toEqual(
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

    expect((result as { props: { initialAvailability: unknown[] } }).props.initialAvailability).toEqual([
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
    expect((result as { props: { initialAvailability: unknown[] } }).props.initialAvailability).toEqual([])
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
