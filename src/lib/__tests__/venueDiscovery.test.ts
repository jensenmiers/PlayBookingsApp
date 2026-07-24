import { buildMapVenuesFromDiscovery } from '../venueDiscovery'

describe('buildMapVenuesFromDiscovery', () => {
  it('maps rpc rows and enriches photo + venue type', () => {
    const venues = buildMapVenuesFromDiscovery(
      [
        {
          venue_id: 'venue-1',
          venue_name: 'Crosscourt',
          venue_city: 'Los Angeles',
          venue_state: 'CA',
          venue_address: '123 Court St',
          hourly_rate: 125,
          instant_booking: true,
          booking_mode: 'instant_slots',
          insurance_required: false,
          offers_open_gym: false,
          offers_private_rental: true,
          drop_in_price: null,
          latitude: 34.05,
          longitude: -118.24,
          distance_miles: 2.5,
          next_slot_id: 'slot-1',
          next_slot_date: '2026-02-20',
          next_slot_start_time: '18:00:00',
          next_slot_end_time: '19:00:00',
          next_slot_action_type: 'info_only_open_gym',
          next_slot_price_amount_cents: 300,
          next_slot_price_currency: 'USD',
          next_slot_price_unit: 'person',
          next_slot_payment_method: 'on_site',
        },
      ],
      [
        {
          id: 'venue-1',
          venue_type: 'Indoor Court',
          photos: ['https://example.com/crosscourt.jpg'],
        },
      ]
    )

    expect(venues).toHaveLength(1)
    expect(venues[0]).toMatchObject({
      id: 'venue-1',
      name: 'Crosscourt',
      venueType: 'Indoor Court',
      photo: 'https://example.com/crosscourt.jpg',
      hourlyRate: 125,
      offersOpenGym: false,
      offersPrivateRental: true,
      dropInPrice: null,
      nextAvailable: {
        slotId: 'slot-1',
        actionType: 'info_only_open_gym',
        pricing: {
          amount_cents: 300,
          currency: 'USD',
          unit: 'person',
          payment_method: 'on_site',
        },
        displayText: 'Fri Feb 20, 6 PM',
      },
    })
  })

  it('defaults type and photo when enrichment is missing', () => {
    const venues = buildMapVenuesFromDiscovery([
      {
        venue_id: 'venue-2',
        venue_name: 'Memorial Park',
        venue_city: 'Santa Monica',
        venue_state: 'CA',
        venue_address: '1401 Olympic Blvd',
        hourly_rate: 75,
        instant_booking: false,
        booking_mode: null,
        insurance_required: false,
        offers_open_gym: true,
        offers_private_rental: true,
        drop_in_price: 3,
        latitude: 34.02,
        longitude: -118.47,
        distance_miles: null,
        next_slot_id: null,
        next_slot_date: null,
        next_slot_start_time: null,
        next_slot_end_time: null,
        next_slot_action_type: null,
        next_slot_price_amount_cents: null,
        next_slot_price_currency: null,
        next_slot_price_unit: null,
        next_slot_payment_method: null,
      },
    ])

    expect(venues[0].venueType).toBe('Sports Facility')
    expect(venues[0].photo).toBeNull()
    expect(venues[0].nextAvailable).toBeNull()
    expect(venues[0].offersOpenGym).toBe(true)
    expect(venues[0].offersPrivateRental).toBe(true)
    expect(venues[0].dropInPrice).toBe(3)
  })

  it('does not infer a rental action when a slot is missing its action type', () => {
    const venues = buildMapVenuesFromDiscovery([
      {
        venue_id: 'venue-3',
        venue_name: 'Contract Drift Court',
        venue_city: 'Los Angeles',
        venue_state: 'CA',
        venue_address: '321 Court St',
        hourly_rate: 100,
        instant_booking: true,
        booking_mode: 'instant_slots',
        insurance_required: false,
        offers_open_gym: true,
        offers_private_rental: true,
        drop_in_price: 5,
        latitude: 34.05,
        longitude: -118.24,
        distance_miles: null,
        next_slot_id: 'slot-3',
        next_slot_date: '2026-02-21',
        next_slot_start_time: '18:00:00',
        next_slot_end_time: '19:00:00',
        next_slot_action_type: null,
        next_slot_price_amount_cents: 500,
        next_slot_price_currency: 'USD',
        next_slot_price_unit: 'person',
        next_slot_payment_method: 'on_site',
      },
    ])

    expect(venues[0].nextAvailable).toBeNull()
  })
})
