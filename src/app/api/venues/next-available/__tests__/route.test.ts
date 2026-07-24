/**
 * @jest-environment node
 */

export {}

const mockCreateClient = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GET /api/venues/next-available', () => {
  let GET: (request: Request) => Promise<Response>

  beforeAll(async () => {
    ;({ GET } = await import('../route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns discovery venues enriched with photo and venue type', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
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
          distance_miles: null,
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
      error: null,
    })

    const inMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'venue-1',
          venue_type: 'Indoor Court',
          photos: ['https://example.com/crosscourt.jpg'],
          venue_media: [],
        },
      ],
      error: null,
    })
    const select = jest.fn(() => ({ in: inMock }))
    const from = jest.fn(() => ({ select }))

    mockCreateClient.mockResolvedValue({ rpc, from })

    const response = await GET(
      new Request('http://localhost/api/venues/next-available')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      id: 'venue-1',
      name: 'Crosscourt',
      venueType: 'Indoor Court',
      photo: 'https://example.com/crosscourt.jpg',
      offersOpenGym: false,
      offersPrivateRental: true,
      nextAvailable: {
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
    expect(rpc).toHaveBeenCalledWith('get_venues_with_next_available', {
      p_date_filter: null,
      p_user_lat: null,
      p_user_lng: null,
      p_radius_miles: null,
      p_access_filter: 'all',
    })
  })

  it('filters discovery venues by access=open_gym', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
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
          distance_miles: null,
          next_slot_id: 'slot-1',
          next_slot_date: '2026-02-20',
          next_slot_start_time: '18:00:00',
          next_slot_end_time: '19:00:00',
        },
        {
          venue_id: 'venue-2',
          venue_name: 'Memorial Park',
          venue_city: 'Santa Monica',
          venue_state: 'CA',
          venue_address: '1401 Olympic Blvd',
          hourly_rate: 75,
          instant_booking: false,
          booking_mode: 'request_to_book',
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
        },
      ],
      error: null,
    })

    mockCreateClient.mockResolvedValue({
      rpc,
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })

    const response = await GET(
      new Request('http://localhost/api/venues/next-available?access=open_gym')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('venue-2')
    expect(body.data[0].offersOpenGym).toBe(true)
    expect(rpc).toHaveBeenCalledWith(
      'get_venues_with_next_available',
      expect.objectContaining({ p_access_filter: 'open_gym' })
    )
  })

  it('forwards optional query filters to the discovery function', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null })
    mockCreateClient.mockResolvedValue({
      rpc,
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })

    const response = await GET(
      new Request(
        'http://localhost/api/venues/next-available?date=2026-02-20&lat=34.05&lng=-118.24&radiusMiles=10'
      )
    )

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('get_venues_with_next_available', {
      p_date_filter: '2026-02-20',
      p_user_lat: 34.05,
      p_user_lng: -118.24,
      p_radius_miles: 10,
      p_access_filter: 'all',
    })
  })

  it('still returns RPC discovery rows when venue enrichment fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const rpc = jest.fn().mockResolvedValue({
      data: [
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
          latitude: 34.05,
          longitude: -118.24,
          distance_miles: null,
          next_slot_id: 'slot-1',
          next_slot_date: '2026-02-20',
          next_slot_start_time: '18:00:00',
          next_slot_end_time: '19:00:00',
          next_slot_action_type: 'instant_book',
          next_slot_price_amount_cents: null,
          next_slot_price_currency: null,
          next_slot_price_unit: null,
          next_slot_payment_method: null,
        },
      ],
      error: null,
    })

    const inMock = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table venues', code: '42501' },
    })
    const select = jest.fn(() => ({ in: inMock }))
    const from = jest.fn(() => ({ select }))

    mockCreateClient.mockResolvedValue({ rpc, from })

    const response = await GET(
      new Request('http://localhost/api/venues/next-available')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      id: 'venue-1',
      name: 'Crosscourt',
      venueType: 'Sports Facility',
      photo: null,
      nextAvailable: {
        displayText: 'Fri Feb 20, 6 PM',
      },
    })
    consoleErrorSpy.mockRestore()
  })
})
