/**
 * Server Component Tests
 * 
 * These tests verify the server-side behavior of the venue page:
 * - generateMetadata returns correct SEO data
 * - notFound() is called for invalid venue slugs
 */

// Mock next/navigation - must be before imports
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

// Create mock functions for Supabase chain
const mockEq = jest.fn()
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ from: mockFrom })),
}))

const mockVenueDesignEditorial = jest.fn(() => null)

jest.mock('@/components/venue/venue-design-editorial', () => ({
  VenueDesignEditorial: mockVenueDesignEditorial,
}))

// Import after mocks
import { generateMetadata } from '../page'
import VenuePage from '../page'
import { notFound } from 'next/navigation'

const mockNotFound = notFound as jest.MockedFunction<typeof notFound>

describe('generateMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns venue name in title for valid venue slug', async () => {
    mockEq.mockResolvedValue({
      data: [
        { name: 'Test Basketball Court', description: 'A great court' },
        { name: 'Another Venue', description: 'Another description' },
      ],
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(metadata.title).toBe('Test Basketball Court | PlayBookings')
    expect(metadata.description).toBe('A great court')
  })

  it('returns "Venue Not Found" for invalid slug', async () => {
    mockEq.mockResolvedValue({
      data: [
        { name: 'Test Basketball Court', description: 'A great court' },
      ],
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'non-existent-venue' }),
    })

    expect(metadata.title).toBe('Venue Not Found')
    expect(metadata.description).toBe('Book venues on PlayBookings')
  })

  it('handles empty venues list', async () => {
    mockEq.mockResolvedValue({
      data: [],
      error: null,
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'any-slug' }),
    })

    expect(metadata.title).toBe('Venue Not Found')
  })
})

describe('VenuePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls notFound() when venue does not exist', async () => {
    mockEq.mockResolvedValue({
      data: [
        {
          id: '123',
          name: 'Existing Venue',
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
        },
      ],
      error: null,
    })

    await expect(
      VenuePage({ params: Promise.resolve({ name: 'non-existent-slug' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('does not call notFound() when venue exists', async () => {
    mockEq.mockResolvedValue({
      data: [
        {
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
        },
      ],
      error: null,
    })

    // This should not throw
    const result = await VenuePage({
      params: Promise.resolve({ name: 'test-basketball-court' }),
    })

    expect(mockNotFound).not.toHaveBeenCalled()
    expect((result as { type: unknown }).type).toBe(mockVenueDesignEditorial)
    expect(result).toBeDefined()
  })
})
