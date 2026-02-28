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

type RouteContext = { params: Promise<{ id: string; bookingId: string }> }

function createContext(id: string, bookingId: string): RouteContext {
  return {
    params: Promise.resolve({ id, bookingId }),
  }
}

type BookingRow = {
  id: string
  venue_id: string
  status: string
  insurance_required: boolean
  insurance_approved: boolean
}

function createAdminClientMock({
  booking,
  bookingError,
  updatedBooking,
  updateError,
  auditError,
}: {
  booking: BookingRow | null
  bookingError: { message: string } | null
  updatedBooking: BookingRow | null
  updateError: { message: string } | null
  auditError: { message: string } | null
}) {
  const fetchSingle = jest.fn().mockResolvedValue({ data: booking, error: bookingError })
  const fetchEq = jest.fn(() => ({ single: fetchSingle }))
  const fetchSelect = jest.fn(() => ({ eq: fetchEq }))

  const updateSingle = jest.fn().mockResolvedValue({ data: updatedBooking, error: updateError })
  const updateSelect = jest.fn(() => ({ single: updateSingle }))
  const updateEq = jest.fn(() => ({ select: updateSelect }))
  const update = jest.fn(() => ({ eq: updateEq }))

  const insertAudit = jest.fn().mockResolvedValue({ error: auditError })

  const from = jest.fn((table: string) => {
    if (table === 'bookings') {
      return {
        select: fetchSelect,
        update,
      }
    }

    if (table === 'audit_logs') {
      return { insert: insertAudit }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from },
    calls: {
      from,
      fetchSelect,
      fetchEq,
      fetchSingle,
      update,
      updateEq,
      updateSelect,
      updateSingle,
      insertAudit,
    },
  }
}

describe('POST /api/admin/venues/[id]/bookings/[bookingId]/insurance-approve', () => {
  let POST: (request: Request, context: RouteContext) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/[id]/bookings/[bookingId]/insurance-approve/route')
    POST = route.POST as (request: Request, context: RouteContext) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
  })

  it('approves insurance for pending insured bookings', async () => {
    const booking = {
      id: 'booking-1',
      venue_id: 'venue-1',
      status: 'pending',
      insurance_required: true,
      insurance_approved: false,
    }
    const updatedBooking = { ...booking, insurance_approved: true }
    const { client, calls } = createAdminClientMock({
      booking,
      bookingError: null,
      updatedBooking,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual(expect.objectContaining({ insurance_approved: true }))
    expect(calls.update).toHaveBeenCalledWith(expect.objectContaining({ insurance_approved: true }))
    expect(calls.insertAudit).toHaveBeenCalled()
  })

  it('returns success without update when booking insurance is already approved', async () => {
    const booking = {
      id: 'booking-1',
      venue_id: 'venue-1',
      status: 'pending',
      insurance_required: true,
      insurance_approved: true,
    }
    const { client, calls } = createAdminClientMock({
      booking,
      bookingError: null,
      updatedBooking: booking,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data).toEqual(expect.objectContaining({ insurance_approved: true }))
    expect(calls.update).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not super-admin', async () => {
    mockRequireSuperAdmin.mockImplementation(() => {
      throw new ApiError(403, 'Super admin access required', 'FORBIDDEN')
    })
    const { client } = createAdminClientMock({
      booking: null,
      bookingError: null,
      updatedBooking: null,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Super admin access required')
  })

  it('returns 400 when booking does not belong to venue', async () => {
    const booking = {
      id: 'booking-1',
      venue_id: 'venue-2',
      status: 'pending',
      insurance_required: true,
      insurance_approved: false,
    }
    const { client } = createAdminClientMock({
      booking,
      bookingError: null,
      updatedBooking: booking,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('does not belong to this venue')
  })

  it('returns 400 when booking is not pending', async () => {
    const booking = {
      id: 'booking-1',
      venue_id: 'venue-1',
      status: 'confirmed',
      insurance_required: true,
      insurance_approved: false,
    }
    const { client } = createAdminClientMock({
      booking,
      bookingError: null,
      updatedBooking: booking,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('Only pending bookings')
  })

  it('returns 400 when booking does not require insurance', async () => {
    const booking = {
      id: 'booking-1',
      venue_id: 'venue-1',
      status: 'pending',
      insurance_required: false,
      insurance_approved: false,
    }
    const { client } = createAdminClientMock({
      booking,
      bookingError: null,
      updatedBooking: booking,
      updateError: null,
      auditError: null,
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await POST(new Request('http://localhost', { method: 'POST' }), createContext('venue-1', 'booking-1'))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.message).toContain('does not require insurance')
  })
})
