/**
 * @jest-environment node
 */

import { ApiError } from '@/utils/errorHandling'

export {}

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockCreateAdminClient = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))

jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

type RouteContext = { params: Promise<{ id: string }> }

function createContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  }
}

function createAdminClientMock({
  bookingsData,
  bookingsError,
  usersData,
  usersError,
}: {
  bookingsData: unknown[]
  bookingsError: { message: string } | null
  usersData: unknown[]
  usersError: { message: string } | null
}) {
  const bookingsOrderStart = jest.fn().mockResolvedValue({ data: bookingsData, error: bookingsError })
  const bookingsOrderDate = jest.fn(() => ({ order: bookingsOrderStart }))
  const bookingsEq = jest.fn(() => ({ order: bookingsOrderDate }))
  const bookingsSelect = jest.fn(() => ({ eq: bookingsEq }))

  const usersIn = jest.fn().mockResolvedValue({ data: usersData, error: usersError })
  const usersSelect = jest.fn(() => ({ in: usersIn }))

  const from = jest.fn((table: string) => {
    if (table === 'bookings') {
      return { select: bookingsSelect }
    }

    if (table === 'users') {
      return { select: usersSelect }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from },
    calls: {
      from,
      bookingsSelect,
      bookingsEq,
      bookingsOrderDate,
      bookingsOrderStart,
      usersSelect,
      usersIn,
    },
  }
}

describe('GET /api/admin/venues/[id]/bookings', () => {
  let GET: (request: Request, context: RouteContext) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/[id]/bookings/route')
    GET = route.GET as (request: Request, context: RouteContext) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
  })

  it('returns venue bookings with projected renter fields for super-admin', async () => {
    const { client, calls } = createAdminClientMock({
      bookingsData: [
        {
          id: 'booking-1',
          venue_id: 'venue-1',
          renter_id: 'renter-1',
          date: '2099-01-01',
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: 'pending',
          total_amount: 120,
          insurance_approved: true,
          insurance_required: false,
          recurring_type: 'none',
          created_at: '2026-02-20T12:00:00.000Z',
          updated_at: '2026-02-20T12:00:00.000Z',
        },
      ],
      bookingsError: null,
      usersData: [
        {
          id: 'renter-1',
          first_name: 'Riley',
          last_name: 'Renter',
          email: 'riley@example.com',
        },
      ],
      usersError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET(new Request('http://localhost'), createContext('venue-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: 'booking-1',
        venue_id: 'venue-1',
        renter: {
          first_name: 'Riley',
          last_name: 'Renter',
          email: 'riley@example.com',
        },
      }),
    ])

    expect(calls.bookingsEq).toHaveBeenCalledWith('venue_id', 'venue-1')
  })

  it('returns 403 when user is not super-admin', async () => {
    mockRequireSuperAdmin.mockImplementation(() => {
      throw new ApiError(403, 'Super admin access required', 'FORBIDDEN')
    })

    const { client } = createAdminClientMock({
      bookingsData: [],
      bookingsError: null,
      usersData: [],
      usersError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET(new Request('http://localhost'), createContext('venue-1'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Super admin access required')
  })

  it('returns 500 when bookings query fails', async () => {
    const { client } = createAdminClientMock({
      bookingsData: [],
      bookingsError: { message: 'db unavailable' },
      usersData: [],
      usersError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET(new Request('http://localhost'), createContext('venue-1'))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Failed to fetch bookings')
  })
})
