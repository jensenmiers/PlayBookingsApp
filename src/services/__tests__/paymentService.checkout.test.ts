/**
 * Unit tests for PaymentService.createCheckoutSession authorization behavior
 */

import { PaymentService } from '../paymentService'
import { stripe } from '@/lib/stripe'
import { PaymentRepository } from '@/repositories/paymentRepository'
import { BookingRepository } from '@/repositories/bookingRepository'
import { createClient } from '@/lib/supabase/server'
import type { Booking, Venue, Payment } from '@/types'

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}))

jest.mock('@/repositories/paymentRepository')
jest.mock('@/repositories/bookingRepository')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('PaymentService.createCheckoutSession', () => {
  let paymentService: PaymentService
  let mockPaymentRepo: jest.Mocked<PaymentRepository>
  let mockBookingRepo: jest.Mocked<BookingRepository>

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    venue_id: 'venue-123',
    renter_id: 'renter-123',
    date: '2025-06-15',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'pending',
    total_amount: 100,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  const createVenue = (overrides: Partial<Venue> = {}): Venue => ({
    id: 'venue-123',
    name: 'Test Venue',
    description: 'A test venue',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip_code: '12345',
    owner_id: 'owner-123',
    hourly_rate: 50,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 180,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'payment-123',
    booking_id: 'booking-123',
    renter_id: 'renter-123',
    venue_id: 'venue-123',
    amount: 100,
    platform_fee: 0,
    venue_owner_amount: 100,
    status: 'pending',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  function mockSupabaseLookups({
    venue,
    user = { is_admin: false },
  }: {
    venue: Venue | null
    user?: { is_admin: boolean } | null
  }) {
    const venueSingleFn = jest.fn().mockResolvedValue({ data: venue, error: venue ? null : { message: 'not found' } })
    const venueEqFn = jest.fn().mockReturnValue({ single: venueSingleFn })
    const venueSelectFn = jest.fn().mockReturnValue({ eq: venueEqFn })

    const userSingleFn = jest.fn().mockResolvedValue({ data: user, error: null })
    const userEqFn = jest.fn().mockReturnValue({ single: userSingleFn })
    const userSelectFn = jest.fn().mockReturnValue({ eq: userEqFn })

    const fromFn = jest.fn().mockImplementation((table: string) => {
      if (table === 'venues') {
        return { select: venueSelectFn }
      }
      if (table === 'users') {
        return { select: userSelectFn }
      }
      throw new Error(`Unexpected table lookup in test: ${table}`)
    })

    ;(createClient as jest.Mock).mockResolvedValue({ from: fromFn })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    paymentService = new PaymentService()
    mockPaymentRepo = (paymentService as unknown as { paymentRepo: jest.Mocked<PaymentRepository> }).paymentRepo
    mockBookingRepo = (paymentService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
  })

  it('allows venue owner to create checkout session for a booking they do not rent', async () => {
    const booking = createBooking({ renter_id: 'renter-456' })
    const venue = createVenue({ owner_id: 'owner-123' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockPaymentRepo.create = jest.fn().mockResolvedValue(createPayment({ renter_id: 'renter-456' }))
    mockSupabaseLookups({ venue })

    ;(stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      payment_intent: 'pi_test_123',
    })

    const result = await paymentService.createCheckoutSession(
      'booking-123',
      'owner-123',
      'https://example.com'
    )

    expect(result).toEqual({
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      sessionId: 'cs_test_123',
      paymentId: 'payment-123',
    })
  })

  it('rejects user who is not renter, venue owner, or admin', async () => {
    const booking = createBooking({ renter_id: 'renter-456' })
    const venue = createVenue({ owner_id: 'owner-123' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockSupabaseLookups({ venue, user: { is_admin: false } })

    await expect(
      paymentService.createCheckoutSession('booking-123', 'outsider-123', 'https://example.com')
    ).rejects.toMatchObject({
      message: 'You do not have permission to pay for this booking',
      statusCode: 400,
    })
  })
})
