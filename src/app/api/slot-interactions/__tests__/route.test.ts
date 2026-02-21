/**
 * @jest-environment node
 *
 * Unit tests for slot interactions route
 * POST /api/slot-interactions
 */

export {}

const mockGetUser = jest.fn()
const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockFrom = jest.fn(() => ({ insert: mockInsert }))
const mockAdminCreateClient = jest.fn(() => ({ from: mockFrom }))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockAdminCreateClient(...args),
}))

type MockRequest = {
  json: () => Promise<unknown>
}

function createRequest(body: unknown): MockRequest {
  return {
    json: async () => body,
  }
}

describe('POST /api/slot-interactions', () => {
  let POST: (request: MockRequest) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/slot-interactions/route')
    POST = route.POST as unknown as (request: MockRequest) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockSingle.mockResolvedValue({ data: { id: 'interaction-1' }, error: null })
  })

  it('returns 400 for invalid event_type', async () => {
    const response = await POST(
      createRequest({
        venue_id: 'venue-1',
        event_type: 'invalid',
      })
    )

    expect(response.status).toBe(400)
    const payload = await response.json()
    expect(payload.success).toBe(false)
  })

  it('writes interaction and returns 201', async () => {
    const response = await POST(
      createRequest({
        slot_instance_id: 'slot-1',
        venue_id: 'venue-1',
        event_type: 'modal_open',
        metadata: { source: 'test' },
      })
    )

    expect(response.status).toBe(201)
    expect(mockAdminCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      expect.any(Object)
    )
    expect(mockFrom).toHaveBeenCalledWith('slot_interactions')
    expect(mockInsert).toHaveBeenCalledWith({
      slot_instance_id: 'slot-1',
      venue_id: 'venue-1',
      user_id: 'user-123',
      event_type: 'modal_open',
      metadata: { source: 'test' },
    })

    const payload = await response.json()
    expect(payload).toEqual({
      success: true,
      data: { id: 'interaction-1' },
    })
  })
})
