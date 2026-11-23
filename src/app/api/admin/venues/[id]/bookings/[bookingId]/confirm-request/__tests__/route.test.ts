/**
 * @jest-environment node
 */

import { ApiError } from '@/utils/errorHandling'

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockConfirm = jest.fn()
const mockDecline = jest.fn()
const mockCapture = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))
jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))
jest.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({ capture: mockCapture, flush: jest.fn().mockResolvedValue(undefined) }),
}))
jest.mock('@/services/bookingRequestService', () => ({
  BookingRequestService: jest.fn().mockImplementation(() => ({
    confirm: (...args: unknown[]) => mockConfirm(...args),
    decline: (...args: unknown[]) => mockDecline(...args),
  })),
}))

import { POST as confirmPOST } from '../route'
import { POST as declinePOST } from '../../decline-request/route'

const context = { params: Promise.resolve({ id: 'venue-1', bookingId: 'booking-1' }) }

function post(body?: unknown) {
  return new Request('http://localhost/api/admin/venues/venue-1/bookings/booking-1/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('booking request decision routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com' })
    mockRequireSuperAdmin.mockReturnValue(undefined)
  })

  it('confirms a request as the signed-in super admin', async () => {
    mockConfirm.mockResolvedValue({ booking: { id: 'booking-1', status: 'confirmed' }, emailSent: true })

    const response = await confirmPOST(post(), context)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(mockConfirm).toHaveBeenCalledWith({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })
    expect(json.message).toBe('Request confirmed')
    expect(mockCapture).toHaveBeenCalledWith(expect.objectContaining({ event: 'booking_request_confirmed' }))
  })

  it('says so when the confirmation email was not sent', async () => {
    mockConfirm.mockResolvedValue({ booking: { id: 'booking-1', status: 'confirmed' }, emailSent: false })

    const json = await (await confirmPOST(post(), context)).json()

    expect(json.message).toBe('Request confirmed, but the email was not sent')
  })

  it('rejects people who are not super admins', async () => {
    mockRequireSuperAdmin.mockImplementation(() => {
      throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
    })

    const response = await confirmPOST(post(), context)

    expect(response.status).toBe(403)
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('declines with an optional reason', async () => {
    mockDecline.mockResolvedValue({ booking: { id: 'booking-1', status: 'cancelled' }, emailSent: true })

    const response = await declinePOST(post({ reason: '  Church event  ' }), context)

    expect(response.status).toBe(200)
    expect(mockDecline).toHaveBeenCalledWith({
      venueId: 'venue-1',
      bookingId: 'booking-1',
      adminUserId: 'admin-1',
      reason: 'Church event',
    })
  })

  it('declines without a body', async () => {
    mockDecline.mockResolvedValue({ booking: { id: 'booking-1', status: 'cancelled' }, emailSent: true })

    const response = await declinePOST(post(), context)

    expect(response.status).toBe(200)
    expect(mockDecline).toHaveBeenCalledWith(expect.objectContaining({ reason: undefined }))
  })

  it('rejects a reason over 500 characters and a body that is not JSON', async () => {
    expect((await declinePOST(post({ reason: 'x'.repeat(501) }), context)).status).toBe(400)
    expect((await declinePOST(post('not json'), context)).status).toBe(400)
    expect(mockDecline).not.toHaveBeenCalled()
  })

  it('still answers when analytics fails', async () => {
    mockConfirm.mockResolvedValue({ booking: { id: 'booking-1', status: 'confirmed' }, emailSent: true })
    mockCapture.mockImplementation(() => {
      throw new Error('PostHog down')
    })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await confirmPOST(post(), context)

    expect(response.status).toBe(200)
    consoleError.mockRestore()
  })
})
