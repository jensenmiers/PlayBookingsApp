import { render, screen } from '@testing-library/react'
import HomePage from '../page'
import type { MapVenue } from '@/lib/venueDiscovery'

const mockDiscoveryVenues: MapVenue[] = [
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
      displayText: 'Thu 7:00 PM',
    },
  },
]

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/layout/public-site-footer', () => ({
  PublicSiteFooter: () => <div><a href="/privacy">Privacy Policy</a></div>,
}))

jest.mock('@/hooks/useVenuesWithNextAvailable', () => ({
  useVenuesWithNextAvailable: () => ({
    data: mockDiscoveryVenues,
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
})
