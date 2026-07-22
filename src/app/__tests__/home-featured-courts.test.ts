import { buildFeaturedCourts } from '../home-featured-courts'
import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'
import type { Venue } from '@/types'
import type { MapVenue, NextAvailableSlot } from '@/lib/venueDiscovery'

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

function createMapVenue(
  overrides: Omit<Partial<MapVenue>, 'nextAvailable'> & {
    nextAvailable?: Partial<NextAvailableSlot> | null
  } = {}
): MapVenue {
  const { nextAvailable, ...venueOverrides } = overrides
  const defaultNextAvailable: NextAvailableSlot = {
    slotId: 'slot-1',
    date: '2026-02-20',
    startTime: '18:00:00',
    endTime: '19:00:00',
    actionType: 'instant_book',
    pricing: null,
    displayText: 'Fri Feb 20, 6 PM',
  }

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
    ...venueOverrides,
    nextAvailable: nextAvailable === null
      ? null
      : { ...defaultNextAvailable, ...nextAvailable },
  }
}

describe('home featured courts mapping', () => {
  it('formats availability with weekday, date, and compact time', () => {
    expect(formatCompactNextAvailable('2026-02-20', '18:00:00')).toBe('Fri Feb 20, 6 PM')
  })

  it('maps open-gym discovery to an accurate label and per-person price', () => {
    const featured = buildFeaturedCourts(
      [createVenue()],
      [createMapVenue({
        nextAvailable: {
          slotId: 'slot-open-gym',
          date: '2026-02-20',
          startTime: '18:00:00',
          endTime: '19:00:00',
          actionType: 'info_only_open_gym',
          pricing: {
            amount_cents: 300,
            currency: 'USD',
            unit: 'person',
            payment_method: 'on_site',
          },
          displayText: 'Fri Feb 20, 6 PM',
        },
      })],
      3
    )

    expect(featured[0]).toMatchObject({
      isOpenGym: true,
      priceLabel: '$3/person',
      nextAvailable: 'Fri Feb 20, 6 PM',
    })
  })

  it('maps dynamic featured cards from venues and next availability', () => {
    const venues: Venue[] = [
      createVenue({
        id: 'venue-2',
        name: 'Crossroads School',
        hourly_rate: 90,
        venue_type: 'School Gymnasium',
        photos: ['https://example.com/crossroads.jpg'],
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
          displayText: 'Fri Feb 20, 6 PM',
        },
      }),
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
    ]

    const featured = buildFeaturedCourts(venues, mapVenues, 3)

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

  it('can pin demo venues in an explicit order even when one has no next slot', () => {
    const venues: Venue[] = [
      createVenue({ id: 'venue-1', name: 'Memorial Park' }),
      createVenue({
        id: 'venue-2',
        name: 'Crosscourt',
        venue_type: 'Indoor Court',
        photos: ['https://example.com/crosscourt.jpg'],
      }),
      createVenue({ id: 'venue-3', name: 'First Presbyterian Church of Hollywood' }),
      createVenue({ id: 'venue-4', name: 'Soonest Dynamic Court' }),
    ]

    const mapVenues: MapVenue[] = [
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

    const featured = buildFeaturedCourts(venues, mapVenues, 3, {
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

  it('still pins demo venues from the active catalog when discovery availability is empty', () => {
    const venues: Venue[] = [
      createVenue({ id: 'venue-1', name: 'Memorial Park', venue_type: 'Recreation Center' }),
      createVenue({ id: 'venue-2', name: 'Crosscourt', venue_type: 'Indoor Court' }),
      createVenue({
        id: 'venue-3',
        name: 'First Presbyterian Church of Hollywood',
        venue_type: 'Church Gym',
      }),
    ]

    const featured = buildFeaturedCourts(venues, [], 3, {
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
    expect(featured.every((court) => court.nextAvailable === 'by request')).toBe(true)
  })

  it('pins preferred venues from the active catalog even when discovery omits ungeocoded venues', () => {
    const venues: Venue[] = [
      createVenue({
        id: 'venue-ungeocoded',
        name: 'First Presbyterian Church of Hollywood',
        venue_type: 'Church Gym',
        photos: ['https://example.com/presbyterian.jpg'],
        latitude: undefined,
        longitude: undefined,
      }),
      createVenue({
        id: 'venue-2',
        name: 'Crosscourt',
        venue_type: 'Indoor Court',
        photos: ['https://example.com/crosscourt.jpg'],
      }),
      createVenue({ id: 'venue-1', name: 'Memorial Park' }),
      createVenue({ id: 'venue-4', name: 'Soonest Dynamic Court' }),
    ]

    // Discovery RPC requires location IS NOT NULL, so the ungeocoded preferred venue is absent.
    const discoveryVenues: MapVenue[] = [
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

    const featured = buildFeaturedCourts(venues, discoveryVenues, 3, {
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
    expect(featured[1]).toMatchObject({
      id: 'venue-ungeocoded',
      type: 'Church Gym',
      nextAvailable: 'by request',
      image: 'https://example.com/presbyterian.jpg',
      href: '/venue/first-presbyterian-church-of-hollywood',
    })
  })
})
