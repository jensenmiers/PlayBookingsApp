/**
 * Unit tests for PaymentService.processPaymentSuccess
 * Tests the updated signature with optional checkoutSessionId
 */

import { PaymentService } from '../paymentService'
import { stripe } from '@/lib/stripe'
import { PaymentRepository } from '@/repositories/paymentRepository'
import { BookingRepository } from '@/repositories/bookingRepository'
import type { Booking, Payment } from '@/types'

// Mock dependencies
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))

jest.mock('@/repositories/paymentRepository')
jest.mock('@/repositories/bookingRepository')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}))

describe('PaymentService.processPaymentSuccess', () => {
  let paymentService: PaymentService
  let mockPaymentRepo: jest.Mocked<PaymentRepository>
  let mockBookingRepo: jest.Mocked<BookingRepository>

  const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'payment-123',
    booking_id: 'booking-123',
    renter_id: 'user-123',
    venue_id: 'venue-123',
    amount: 100,
    platform_fee: 0,
    venue_owner_amount: 100,
    status: 'pending',
    stripe_payment_intent_id: 'pi_test_123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    venue_id: 'venue-123',
    renter_id: 'user-123',
    date: '2025-06-15',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'confirmed',
    total_amount: 100,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    paymentService = new PaymentService()
    mockPaymentRepo = (paymentService as unknown as { paymentRepo: jest.Mocked<PaymentRepository> }).paymentRepo
    mockBookingRepo = (paymentService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
  })

  it('should find payment by paymentIntentId and update to paid, booking to confirmed', async () => {
    const payment = createPayment({ status: 'pending' })
    const updatedPayment = createPayment({ status: 'paid' })
    const confirmedBooking = createBooking({ status: 'confirmed' })

    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(payment)
    mockPaymentRepo.update = jest.fn().mockResolvedValue(updatedPayment)
    mockBookingRepo.update = jest.fn().mockResolvedValue(confirmedBooking)

    const result = await paymentService.processPaymentSuccess('pi_test_123')

    expect(result.payment).toEqual(updatedPayment)
    expect(result.booking).toEqual(confirmedBooking)

    expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', expect.objectContaining({
      status: 'paid',
      stripe_payment_intent_id: 'pi_test_123',
    }))

    expect(mockBookingRepo.update).toHaveBeenCalledWith('booking-123', {
      status: 'confirmed',
    })
  })

  it('should fall back to checkout session metadata when paymentIntentId lookup returns null', async () => {
    const payment = createPayment({ status: 'pending' })
    const updatedPayment = createPayment({ status: 'paid' })
    const confirmedBooking = createBooking({ status: 'confirmed' })

    // First lookup fails
    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(null)
    // Checkout session provides booking_id
    ;(stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      metadata: { booking_id: 'booking-123' },
    })
    // Second lookup succeeds
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
    mockPaymentRepo.update = jest.fn().mockResolvedValue(updatedPayment)
    mockBookingRepo.update = jest.fn().mockResolvedValue(confirmedBooking)

    const result = await paymentService.processPaymentSuccess('pi_unknown', 'cs_session_123')

    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_session_123')
    expect(mockPaymentRepo.findByBookingId).toHaveBeenCalledWith('booking-123')
    expect(result.payment).toEqual(updatedPayment)
  })

  it('should NOT call stripe.checkout.sessions.retrieve when checkoutSessionId is omitted', async () => {
    const payment = createPayment({ status: 'pending' })
    const updatedPayment = createPayment({ status: 'paid' })
    const confirmedBooking = createBooking({ status: 'confirmed' })

    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(payment)
    mockPaymentRepo.update = jest.fn().mockResolvedValue(updatedPayment)
    mockBookingRepo.update = jest.fn().mockResolvedValue(confirmedBooking)

    await paymentService.processPaymentSuccess('pi_test_123')

    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled()
  })

  it('should return existing payment/booking when already paid (idempotency)', async () => {
    const paidPayment = createPayment({ status: 'paid' })
    const confirmedBooking = createBooking({ status: 'confirmed' })

    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(paidPayment)
    mockBookingRepo.findById = jest.fn().mockResolvedValue(confirmedBooking)

    const result = await paymentService.processPaymentSuccess('pi_test_123')

    expect(result.payment).toEqual(paidPayment)
    expect(result.booking).toEqual(confirmedBooking)

    // Should NOT update anything
    expect(mockPaymentRepo.update).not.toHaveBeenCalled()
    expect(mockBookingRepo.update).not.toHaveBeenCalled()
  })

  it('should throw "Payment not found" when neither lookup finds a payment', async () => {
    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(null)

    await expect(
      paymentService.processPaymentSuccess('pi_nonexistent')
    ).rejects.toMatchObject({
      message: 'Payment not found for this transaction',
      statusCode: 404,
    })

    // No checkout session fallback since no checkoutSessionId provided
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled()
  })

  it('should throw "Payment not found" when checkout session fallback also fails', async () => {
    mockPaymentRepo.findByStripePaymentIntentId = jest.fn().mockResolvedValue(null)
    ;(stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      metadata: { booking_id: 'booking-123' },
    })
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)

    await expect(
      paymentService.processPaymentSuccess('pi_nonexistent', 'cs_session_123')
    ).rejects.toMatchObject({
      message: 'Payment not found for this transaction',
      statusCode: 404,
    })
  })
})
