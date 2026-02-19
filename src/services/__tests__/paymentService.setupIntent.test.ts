/**
 * Unit tests for PaymentService SetupIntent functionality
 * Tests deferred payment flow: createSetupIntent, capturePayment, cancelSetupIntent
 */

import { PaymentService } from '../paymentService'
import { stripe } from '@/lib/stripe'
import { PaymentRepository } from '@/repositories/paymentRepository'
import { BookingRepository } from '@/repositories/bookingRepository'
import { createClient } from '@/lib/supabase/server'
import type { Booking, Venue, Payment } from '@/types'

// Mock dependencies
jest.mock('@/lib/stripe', () => ({
  stripe: {
    setupIntents: {
      create: jest.fn(),
      cancel: jest.fn(),
      retrieve: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/repositories/paymentRepository')
jest.mock('@/repositories/bookingRepository')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('PaymentService - SetupIntent Flow', () => {
  let paymentService: PaymentService
  let mockPaymentRepo: jest.Mocked<PaymentRepository>
  let mockBookingRepo: jest.Mocked<BookingRepository>
  let mockSupabase: {
    from: jest.Mock
  }

  // Test data factories
  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    venue_id: 'venue-123',
    renter_id: 'user-123',
    date: '2024-12-01',
    start_time: '10:00:00',
    end_time: '12:00:00',
    status: 'pending',
    total_amount: 100,
    insurance_approved: false,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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
    instant_booking: false,
    insurance_required: false,
    max_advance_booking_days: 180,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'payment-123',
    booking_id: 'booking-123',
    renter_id: 'user-123',
    venue_id: 'venue-123',
    amount: 100,
    platform_fee: 0,
    venue_owner_amount: 100,
    status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createVenue(), error: null }),
          }
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
          }
        }
        return mockSupabase
      }),
    })

    paymentService = new PaymentService()
    mockPaymentRepo = (paymentService as unknown as { paymentRepo: jest.Mocked<PaymentRepository> }).paymentRepo
    mockBookingRepo = (paymentService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
  })

  describe('createSetupIntent', () => {
    it('should create a setup intent with correct payment_method_types', async () => {
      const booking = createBooking()
      const payment = createPayment({ stripe_setup_intent_id: 'seti_123', status: 'authorized' })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
      mockPaymentRepo.create = jest.fn().mockResolvedValue(payment)
      ;(stripe.setupIntents.create as jest.Mock).mockResolvedValue({
        id: 'seti_123',
        client_secret: 'seti_123_secret_abc',
      })

      const result = await paymentService.createSetupIntent('booking-123', 'user-123')

      expect(stripe.setupIntents.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        metadata: expect.objectContaining({
          booking_id: 'booking-123',
          venue_id: 'venue-123',
          renter_id: 'user-123',
        }),
      })
      expect(result).toEqual({
        clientSecret: 'seti_123_secret_abc',
        paymentId: 'payment-123',
        amount: 100,
        setupIntentId: 'seti_123',
      })
    })

    it('should return clientSecret, paymentId, amount, and setupIntentId', async () => {
      const booking = createBooking({ total_amount: 250 })
      const payment = createPayment({ id: 'pay-456', amount: 250, stripe_setup_intent_id: 'seti_456' })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
      mockPaymentRepo.create = jest.fn().mockResolvedValue(payment)
      ;(stripe.setupIntents.create as jest.Mock).mockResolvedValue({
        id: 'seti_456',
        client_secret: 'seti_456_secret_xyz',
      })

      const result = await paymentService.createSetupIntent('booking-123', 'user-123')

      expect(result.clientSecret).toBe('seti_456_secret_xyz')
      expect(result.paymentId).toBe('pay-456')
      expect(result.amount).toBe(250)
      expect(result.setupIntentId).toBe('seti_456')
    })

    it('should throw NotFoundError for non-existent booking', async () => {
      mockBookingRepo.findById = jest.fn().mockResolvedValue(null)

      await expect(paymentService.createSetupIntent('nonexistent', 'user-123'))
        .rejects.toThrow('Booking not found')
    })

    it('should allow venue owner to create setup intent for a booking they do not rent', async () => {
      const booking = createBooking({ renter_id: 'renter-999' })
      const payment = createPayment({ renter_id: 'renter-999', stripe_setup_intent_id: 'seti_owner', status: 'authorized' })

      ;(createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'venues') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: createVenue({ owner_id: 'owner-123' }), error: null }),
            }
          }
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
            }
          }
          return mockSupabase
        }),
      })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
      mockPaymentRepo.create = jest.fn().mockResolvedValue(payment)
      ;(stripe.setupIntents.create as jest.Mock).mockResolvedValue({
        id: 'seti_owner',
        client_secret: 'seti_owner_secret',
      })

      const result = await paymentService.createSetupIntent('booking-123', 'owner-123')

      expect(result.setupIntentId).toBe('seti_owner')
      expect(result.paymentId).toBe('payment-123')
      expect(result.amount).toBe(100)
    })

    it('should reject user who is not renter, venue owner, or admin', async () => {
      const booking = createBooking({ renter_id: 'renter-999' })

      ;(createClient as jest.Mock).mockResolvedValue({
        from: jest.fn().mockImplementation((table: string) => {
          if (table === 'venues') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: createVenue({ owner_id: 'owner-123' }), error: null }),
            }
          }
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { is_admin: false }, error: null }),
            }
          }
          return mockSupabase
        }),
      })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

      await expect(paymentService.createSetupIntent('booking-123', 'outsider-123'))
        .rejects.toThrow('You do not have permission to pay for this booking')
    })

    it('should throw BadRequestError for cancelled booking', async () => {
      const booking = createBooking({ status: 'cancelled' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

      await expect(paymentService.createSetupIntent('booking-123', 'user-123'))
        .rejects.toThrow('Cannot authorize payment for a cancelled booking')
    })

    it('should throw BadRequestError for completed booking', async () => {
      const booking = createBooking({ status: 'completed' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

      await expect(paymentService.createSetupIntent('booking-123', 'user-123'))
        .rejects.toThrow('This booking is already completed')
    })

    it('should throw BadRequestError if already paid', async () => {
      const booking = createBooking()
      const existingPayment = createPayment({ status: 'paid' })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(existingPayment)

      await expect(paymentService.createSetupIntent('booking-123', 'user-123'))
        .rejects.toThrow('This booking has already been paid')
    })

    it('should throw BadRequestError if already authorized', async () => {
      const booking = createBooking()
      const existingPayment = createPayment({ status: 'authorized' })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(existingPayment)

      await expect(paymentService.createSetupIntent('booking-123', 'user-123'))
        .rejects.toThrow('Payment has already been authorized for this booking')
    })

    it('should update existing pending payment instead of creating new one', async () => {
      const booking = createBooking()
      const existingPayment = createPayment({ status: 'pending' })
      const updatedPayment = createPayment({ status: 'authorized', stripe_setup_intent_id: 'seti_789' })

      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(existingPayment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue(updatedPayment)
      ;(stripe.setupIntents.create as jest.Mock).mockResolvedValue({
        id: 'seti_789',
        client_secret: 'seti_789_secret',
      })

      await paymentService.createSetupIntent('booking-123', 'user-123')

      expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', {
        stripe_setup_intent_id: 'seti_789',
        status: 'authorized',
      })
      expect(mockPaymentRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('capturePayment', () => {
    it('should charge authorized payment successfully', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
        amount: 100,
      })
      const booking = createBooking()

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'paid' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockBookingRepo.update = jest.fn().mockResolvedValue({ ...booking, status: 'confirmed' })
      ;(stripe.setupIntents.retrieve as jest.Mock).mockResolvedValue({
        payment_method: 'pm_123',
      })
      ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      })

      const result = await paymentService.capturePayment('booking-123', 'owner-123')

      expect(result.status).toBe('paid')
      expect(result.paymentIntentId).toBe('pi_123')
      expect(result.amount).toBe(100)
    })

    it('should update payment status from authorized to paid', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })
      const booking = createBooking()

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'paid' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockBookingRepo.update = jest.fn().mockResolvedValue({ ...booking, status: 'confirmed' })
      ;(stripe.setupIntents.retrieve as jest.Mock).mockResolvedValue({
        payment_method: 'pm_123',
      })
      ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      })

      await paymentService.capturePayment('booking-123', 'owner-123')

      expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', expect.objectContaining({
        status: 'paid',
        stripe_payment_intent_id: 'pi_123',
      }))
    })

    it('should update booking status to confirmed on successful capture', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })
      const booking = createBooking()

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'paid' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      mockBookingRepo.update = jest.fn().mockResolvedValue({ ...booking, status: 'confirmed' })
      ;(stripe.setupIntents.retrieve as jest.Mock).mockResolvedValue({
        payment_method: 'pm_123',
      })
      ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded',
      })

      await paymentService.capturePayment('booking-123', 'owner-123')

      expect(mockBookingRepo.update).toHaveBeenCalledWith('booking-123', {
        status: 'confirmed',
      })
    })

    it('should throw NotFoundError for missing payment', async () => {
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)

      await expect(paymentService.capturePayment('booking-123', 'owner-123'))
        .rejects.toThrow('No payment found for this booking')
    })

    it('should throw BadRequestError if already paid', async () => {
      const payment = createPayment({ status: 'paid' })
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)

      await expect(paymentService.capturePayment('booking-123', 'owner-123'))
        .rejects.toThrow('This booking has already been paid')
    })

    it('should throw BadRequestError if payment not authorized', async () => {
      const payment = createPayment({ status: 'pending' })
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)

      await expect(paymentService.capturePayment('booking-123', 'owner-123'))
        .rejects.toThrow('Payment must be authorized before capturing')
    })

    it('should throw BadRequestError if no setup intent found', async () => {
      const payment = createPayment({ status: 'authorized', stripe_setup_intent_id: undefined })
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)

      await expect(paymentService.capturePayment('booking-123', 'owner-123'))
        .rejects.toThrow('No setup intent found for this payment')
    })

    it('should handle failed capture and update status to failed', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })
      const booking = createBooking()

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'failed' })
      mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
      ;(stripe.setupIntents.retrieve as jest.Mock).mockResolvedValue({
        payment_method: 'pm_123',
      })
      ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
        id: 'pi_123',
        status: 'requires_payment_method', // Failed status
      })

      const result = await paymentService.capturePayment('booking-123', 'owner-123')

      expect(result.status).toBe('failed')
      expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', expect.objectContaining({
        status: 'failed',
      }))
    })
  })

  describe('cancelSetupIntent', () => {
    it('should cancel Stripe SetupIntent', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'failed' })
      ;(stripe.setupIntents.cancel as jest.Mock).mockResolvedValue({})

      await paymentService.cancelSetupIntent('booking-123', 'user-123')

      expect(stripe.setupIntents.cancel).toHaveBeenCalledWith('seti_123')
    })

    it('should update payment status to failed', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'failed' })
      ;(stripe.setupIntents.cancel as jest.Mock).mockResolvedValue({})

      await paymentService.cancelSetupIntent('booking-123', 'user-123')

      expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', {
        status: 'failed',
      })
    })

    it('should no-op if payment not found', async () => {
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)

      // Should not throw
      await expect(paymentService.cancelSetupIntent('booking-123', 'user-123'))
        .resolves.toBeUndefined()

      expect(stripe.setupIntents.cancel).not.toHaveBeenCalled()
    })

    it('should no-op if payment not in authorized status', async () => {
      const payment = createPayment({ status: 'paid' })
      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)

      await expect(paymentService.cancelSetupIntent('booking-123', 'user-123'))
        .resolves.toBeUndefined()

      expect(stripe.setupIntents.cancel).not.toHaveBeenCalled()
    })

    it('should handle Stripe API errors gracefully', async () => {
      const payment = createPayment({
        status: 'authorized',
        stripe_setup_intent_id: 'seti_123',
      })

      mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(payment)
      mockPaymentRepo.update = jest.fn().mockResolvedValue({ ...payment, status: 'failed' })
      ;(stripe.setupIntents.cancel as jest.Mock).mockRejectedValue(new Error('Already cancelled'))

      // Should not throw, should continue with cleanup
      await expect(paymentService.cancelSetupIntent('booking-123', 'user-123'))
        .resolves.toBeUndefined()

      // Should still update payment status
      expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-123', {
        status: 'failed',
      })
    })
  })
})
