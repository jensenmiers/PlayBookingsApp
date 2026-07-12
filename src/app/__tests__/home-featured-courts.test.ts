import { buildFeaturedCourts } from '../home-featured-courts'
import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'
import type { MapVenue } from '@/lib/venueDiscovery'

function createMapVenue(overrides: Partial<MapVenue> = {}): MapVenue {
  return {
    id: 'venue-1',
    name: 'Memorial Park',
    city: 'Santa Monica',
    state: 'CA',
    address: '1401 Olympic Blvd',
    hourlyRate: 75,
    instantBooking: false,
    bookingMode: null,
    insuranceRequired: false,
    latitude: 34.0244,
    longitude: -118.4725,
    distanceMiles: null,
    venueType: 'Recreation Center',
    photo: 'https://example.com/memorial.jpg',
    nextAvailable: {
      slotId: 'slot-1',
      date: '2026-02-20',
      startTime: '18:00:00',
      endTime: '19:00:00',
      displayText: 'Fri Feb 20, 6 PM',
    },
    ...overrides,
  }
}

describe('home featured courts mapping', () => {
  it('formats availability with weekday, date, and compact time', () => {
    expect(formatCompactNextAvailable('2026-02-20', '18:00:00')).toBe('Fri Feb 20, 6 PM')
  })

  it('maps dynamic featured cards from a single discovery payload', () => {
    const venues: MapVenue[] = [
      createMapVenue({
        id: 'venue-2',
        name: 'Crossroads School',
        hourlyRate: 90,
        venueType: 'School Gymnasium',
        photo: 'https://example.com/crossroads.jpg',
        nextAvailable: {
          slotId: 'slot-2',
          date: '2026-02-19',
          startTime: '16:00:00',
          endTime: '17:00:00',
          displayText: 'Thu Feb 19, 4 PM',
        },
      }),
      createMapVenue({
        id: 'venue-1',
        name: 'Memorial Park',
        hourlyRate: 75,
        venueType: 'Recreation Center',
        nextAvailable: {
          slotId: 'slot-1',
          date: '2026-02-20',
          startTime: '18:00:00',
          endTime: '19:00:00',
          displayText: 'Fri Feb 20, 6 PM',
        },
      }),
    ]

    const featured = buildFeaturedCourts(venues, 3)

    expect(featured).toHaveLength(2)
    expect(featured[0]).toMatchObject({
      id: 'venue-2',
      name: 'Crossroads School',
      type: 'School Gymnasium',
      hourlyRate: 90,
      nextAvailable: 'Thu Feb 19, 4 PM',
      image: 'https://example.com/crossroads.jpg',
      href: '/venue/crossroads-school',
    })
    expect(featured[1]).toMatchObject({
      id: 'venue-1',
      name: 'Memorial Park',
      type: 'Recreation Center',
      hourlyRate: 75,
      nextAvailable: 'Fri Feb 20, 6 PM',
      href: '/venue/memorial-park',
    })
  })

  it('ignores venues without future availability', () => {
    const venues: MapVenue[] = [
      createMapVenue({ id: 'venue-1', name: 'Memorial Park' }),
      createMapVenue({ id: 'venue-2', name: 'Crosscourt', nextAvailable: null }),
    ]

    const featured = buildFeaturedCourts(venues, 3)

    expect(featured).toHaveLength(1)
    expect(featured[0].id).toBe('venue-1')
  })

  it('can pin demo venues in an explicit order even when one has no next slot', () => {
    const venues: MapVenue[] = [
      createMapVenue({
        id: 'venue-1',
        name: 'Memorial Park',
        nextAvailable: {
          slotId: 'slot-1',
          date: '2026-02-22',
          startTime: '18:00:00',
          endTime: '19:00:00',
          displayText: 'Sun Feb 22, 6 PM',
        },
      }),
      createMapVenue({
        id: 'venue-2',
        name: 'Crosscourt',
        venueType: 'Indoor Court',
        photo: 'https://example.com/crosscourt.jpg',
        nextAvailable: {
          slotId: 'slot-2',
          date: '2026-02-21',
          startTime: '16:00:00',
          endTime: '17:00:00',
          displayText: 'Sat Feb 21, 4 PM',
        },
      }),
      createMapVenue({
        id: 'venue-3',
        name: 'First Presbyterian Church of Hollywood',
        nextAvailable: null,
      }),
      createMapVenue({
        id: 'venue-4',
        name: 'Soonest Dynamic Court',
        nextAvailable: {
          slotId: 'slot-4',
          date: '2026-02-19',
          startTime: '12:00:00',
          endTime: '13:00:00',
          displayText: 'Thu Feb 19, 12 PM',
        },
      }),
    ]

    const featured = buildFeaturedCourts(venues, 3, {
      preferredVenueNames: [
        'Crosscourt',
        'First Presbyterian Church of Hollywood',
        'Memorial Park',
      ],
      fallbackAvailabilityLabel: 'by request',
    })

    expect(featured.map((court) => court.name)).toEqual([
      'Crosscourt',
      'First Presbyterian Church of Hollywood',
      'Memorial Park',
    ])
    expect(featured[1].nextAvailable).toBe('by request')
  })
})
