import { render, screen } from '@testing-library/react'
import HomePage from '../page'
import type { Venue } from '@/types'
import type { MapVenue } from '@/lib/venueDiscovery'

const mockVenues: Venue[] = [
  {
    id: 'venue-1',
    name: 'Main Street Court',
    description: 'Indoor full court',
    venue_type: 'Basketball Court',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    owner_id: 'owner-1',
    hourly_rate: 95,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: ['https://example.com/court-1.jpg'],
    amenities: [],
    is_active: true,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'venue-2',
    name: 'Sunset Gym',
    description: 'Neighborhood gym',
    venue_type: 'Gym',
    address: '456 Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90002',
    owner_id: 'owner-2',
    hourly_rate: 80,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: ['https://example.com/court-2.jpg'],
    amenities: [],
    is_active: true,
    created_at: '2026-03-02T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
  },
]

const mockAvailabilityVenues: MapVenue[] = [
  {
    id: 'venue-1',
    name: 'Main Street Court',
    city: 'Los Angeles',
    state: 'CA',
    address: '123 Main St',
    hourlyRate: 95,
    instantBooking: true,
    bookingMode: 'instant_slots',
    insuranceRequired: false,
    offersOpenGym: false,
    offersPrivateRental: true,
    dropInPrice: null,
    latitude: 34.05,
    longitude: -118.24,
    distanceMiles: 2,
    venueType: 'Basketball Court',
    photo: 'https://example.com/court-1.jpg',
    nextAvailable: {
      slotId: 'slot-1',
      date: '2026-03-25',
      startTime: '18:00:00',
      endTime: '19:00:00',
      actionType: 'instant_book',
      pricing: null,
      displayText: 'Wed 6:00 PM',
    },
  },
  {
    id: 'venue-2',
    name: 'Sunset Gym',
    city: 'Los Angeles',
    state: 'CA',
    address: '456 Sunset Blvd',
    hourlyRate: 80,
    instantBooking: true,
    bookingMode: 'instant_slots',
    insuranceRequired: false,
    offersOpenGym: false,
    offersPrivateRental: true,
    dropInPrice: null,
    latitude: 34.06,
    longitude: -118.25,
    distanceMiles: 4,
    venueType: 'Gym',
    photo: 'https://example.com/court-2.jpg',
    nextAvailable: {
      slotId: 'slot-2',
      date: '2026-03-26',
      startTime: '19:00:00',
      endTime: '20:00:00',
      actionType: 'instant_book',
      pricing: null,
      displayText: 'Thu 7:00 PM',
    },
  },
]

const mockUseVenues = jest.fn()
const mockUseVenuesWithNextAvailable = jest.fn()

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/layout/public-site-footer', () => ({
  PublicSiteFooter: () => <div><a href="/privacy">Privacy Policy</a></div>,
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenues: (...args: unknown[]) => mockUseVenues(...args),
}))

jest.mock('@/hooks/useVenuesWithNextAvailable', () => ({
  useVenuesWithNextAvailable: (...args: unknown[]) => mockUseVenuesWithNextAvailable(...args),
}))

describe('HomePage', () => {
  beforeEach(() => {
    mockUseVenues.mockReturnValue({
      data: mockVenues,
      loading: false,
      error: null,
    })
    mockUseVenuesWithNextAvailable.mockReturnValue({
      data: mockAvailabilityVenues,
      loading: false,
      error: null,
    })
  })

  it('preserves mobile and downstream sections while adopting the /4 desktop hero treatment', () => {
    const { container } = render(<HomePage />)

    expect(screen.getByRole('heading', { name: /available courts/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /how it works/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /your community's courts are waiting/i, level: 2 })).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: /main street court/i })).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: expect.stringContaining('/venue/main-street-court') })])
    )
    expect(screen.getAllByRole('link', { name: /sunset gym/i })).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: expect.stringContaining('/venue/sunset-gym') })])
    )

    expect(container.querySelector('.lg\\:w-\\[55\\%\\]')).toBeTruthy()
    expect(container.querySelector('.lg\\:w-\\[45\\%\\]')).toBeTruthy()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })

  it('keeps desktop featured cards on a non-collapsing height chain so their background photos can render', () => {
    const { container } = render(<HomePage />)

    const desktopRail = container.querySelector('.lg\\:w-\\[45\\%\\]')
    expect(desktopRail).toBeTruthy()

    const desktopFeaturedLink = desktopRail?.querySelector('a[href="/venue/main-street-court"]')
    expect(desktopFeaturedLink).toBeTruthy()
    expect(desktopFeaturedLink?.className).toContain('h-full')

    const desktopMediaRegion = desktopFeaturedLink?.querySelector('.min-h-\\[140px\\]')
    expect(desktopMediaRegion).toBeTruthy()
    expect(desktopMediaRegion?.className).toContain('flex-1')
  })

  it('still shows pinned demo venues when next-available discovery fails on first load', () => {
    mockUseVenues.mockReturnValue({
      data: [
        {
          id: 'venue-crosscourt',
          name: 'Crosscourt',
          description: 'Demo court',
          venue_type: 'Indoor Court',
          address: '1 Court St',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          owner_id: 'owner-1',
          hourly_rate: 100,
          instant_booking: true,
          insurance_required: false,
          max_advance_booking_days: 30,
          photos: ['https://example.com/crosscourt.jpg'],
          amenities: [],
          is_active: true,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'venue-fpc',
          name: 'First Presbyterian Church of Hollywood',
          description: 'Demo court',
          venue_type: 'Church Gym',
          address: '2 Church St',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90028',
          owner_id: 'owner-2',
          hourly_rate: 80,
          instant_booking: false,
          insurance_required: false,
          max_advance_booking_days: 30,
          photos: ['https://example.com/fpc.jpg'],
          amenities: [],
          is_active: true,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'venue-memorial',
          name: 'Memorial Park',
          description: 'Demo court',
          venue_type: 'Recreation Center',
          address: '3 Park St',
          city: 'Santa Monica',
          state: 'CA',
          zip_code: '90404',
          owner_id: 'owner-3',
          hourly_rate: 75,
          instant_booking: false,
          insurance_required: false,
          max_advance_booking_days: 30,
          photos: ['https://example.com/memorial.jpg'],
          amenities: [],
          is_active: true,
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ] satisfies Venue[],
      loading: false,
      error: null,
    })
    mockUseVenuesWithNextAvailable.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to fetch venues',
    })

    render(<HomePage />)

    expect(screen.getAllByRole('link', { name: /crosscourt/i }).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: /first presbyterian church of hollywood/i }).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /memorial park/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/by request/i).length).toBeGreaterThan(0)
  })
})
