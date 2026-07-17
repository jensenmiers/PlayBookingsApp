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
          latitude: 34.05,
          longitude: -118.24,
          distance_miles: null,
          next_slot_id: 'slot-1',
          next_slot_date: '2026-02-20',
          next_slot_start_time: '18:00:00',
          next_slot_end_time: '19:00:00',
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
      nextAvailable: {
        displayText: 'Fri Feb 20, 6 PM',
      },
    })
    expect(rpc).toHaveBeenCalledWith('get_venues_with_next_available', {
      p_date_filter: null,
      p_user_lat: null,
      p_user_lng: null,
      p_radius_miles: null,
    })
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
