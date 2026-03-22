import { render, screen } from '@testing-library/react'
import HomePage from '../page'
import type { Venue } from '@/types'
import type { MapVenue } from '@/hooks/useVenuesWithNextAvailable'

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
    insuranceRequired: false,
    latitude: 34.05,
    longitude: -118.24,
    distanceMiles: 2,
    nextAvailable: {
      slotId: 'slot-1',
      date: '2026-03-25',
      startTime: '18:00:00',
      endTime: '19:00:00',
      displayText: 'Mar 25 6:00 PM',
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
    insuranceRequired: false,
    latitude: 34.06,
    longitude: -118.25,
    distanceMiles: 4,
    nextAvailable: {
      slotId: 'slot-2',
      date: '2026-03-26',
      startTime: '19:00:00',
      endTime: '20:00:00',
      displayText: 'Mar 26 7:00 PM',
    },
  },
]

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/layout/public-site-footer', () => ({
  PublicSiteFooter: () => <div><a href="/privacy">Privacy Policy</a></div>,
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenues: () => ({
    data: mockVenues,
    loading: false,
    error: null,
  }),
}))

jest.mock('@/hooks/useVenuesWithNextAvailable', () => ({
  useVenuesWithNextAvailable: () => ({
    data: mockAvailabilityVenues,
    loading: false,
    error: null,
  }),
}))

describe('HomePage', () => {
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
})
