import { buildFeaturedCourts, formatFeaturedAvailability } from '../home-featured-courts'
import type { Venue } from '@/types'
import type { MapVenue } from '@/hooks/useVenuesWithNextAvailable'

function createVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    name: 'Memorial Park',
    description: 'Community basketball gym.',
    address: '1401 Olympic Blvd',
    city: 'Santa Monica',
    state: 'CA',
    zip_code: '90404',
    owner_id: 'owner-1',
    hourly_rate: 75,
    weekend_rate: 95,
    instant_booking: false,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: ['https://example.com/memorial.jpg'],
    amenities: ['Indoor Court'],
    is_active: true,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    ...overrides,
  }
}

function createMapVenue(overrides: Partial<MapVenue> = {}): MapVenue {
  return {
    id: 'venue-1',
    name: 'Memorial Park',
    city: 'Santa Monica',
    state: 'CA',
    address: '1401 Olympic Blvd',
    hourlyRate: 75,
    instantBooking: false,
    latitude: 34.0244,
    longitude: -118.4725,
    distanceMiles: null,
    nextAvailable: {
      slotId: 'slot-1',
      date: '2026-02-20',
      startTime: '18:00:00',
      endTime: '19:00:00',
      displayText: 'Tomorrow 6:00 PM',
    },
    ...overrides,
  }
}

describe('home featured courts mapping', () => {
  it('formats availability with weekday and time', () => {
    expect(formatFeaturedAvailability('2026-02-20', '18:00:00')).toBe('Fri 6:00 PM')
  })

  it('maps dynamic featured cards from venues and next availability', () => {
    const venues: Venue[] = [
      createVenue({
        id: 'venue-2',
        name: 'Crossroads School',
        hourly_rate: 90,
        venue_type: 'School Gymnasium',
      }),
      createVenue({
        id: 'venue-1',
        name: 'Memorial Park',
        hourly_rate: 75,
        venue_type: 'Recreation Center',
      }),
    ]

    const mapVenues: MapVenue[] = [
      createMapVenue({
        id: 'venue-1',
        name: 'Memorial Park',
        nextAvailable: {
          slotId: 'slot-1',
          date: '2026-02-20',
          startTime: '18:00:00',
          endTime: '19:00:00',
          displayText: 'Tomorrow 6:00 PM',
        },
      }),
      createMapVenue({
        id: 'venue-2',
        name: 'Crossroads School',
        nextAvailable: {
          slotId: 'slot-2',
          date: '2026-02-19',
          startTime: '16:00:00',
          endTime: '17:00:00',
          displayText: 'Today 4:00 PM',
        },
      }),
    ]

    const featured = buildFeaturedCourts(venues, mapVenues, 3)

    expect(featured).toHaveLength(2)
    expect(featured[0]).toMatchObject({
      id: 'venue-2',
      name: 'Crossroads School',
      type: 'School Gymnasium',
      hourlyRate: 90,
      nextAvailable: 'Thu 4:00 PM',
      href: '/venue/crossroads-school',
    })
    expect(featured[1]).toMatchObject({
      id: 'venue-1',
      name: 'Memorial Park',
      type: 'Recreation Center',
      hourlyRate: 75,
      nextAvailable: 'Fri 6:00 PM',
      href: '/venue/memorial-park',
    })
  })

  it('ignores venues without future availability', () => {
    const venues: Venue[] = [
      createVenue({ id: 'venue-1', name: 'Memorial Park' }),
      createVenue({ id: 'venue-2', name: 'Crosscourt' }),
    ]

    const mapVenues: MapVenue[] = [
      createMapVenue({ id: 'venue-1' }),
      createMapVenue({ id: 'venue-2', nextAvailable: null }),
    ]

    const featured = buildFeaturedCourts(venues, mapVenues, 3)

    expect(featured).toHaveLength(1)
    expect(featured[0].id).toBe('venue-1')
  })
})
