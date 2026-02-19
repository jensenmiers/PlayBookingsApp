/**
 * Unit tests for PaymentService.createPaymentIntent
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
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))

jest.mock('@/repositories/paymentRepository')
jest.mock('@/repositories/bookingRepository')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('PaymentService.createPaymentIntent', () => {
  let paymentService: PaymentService
  let mockPaymentRepo: jest.Mocked<PaymentRepository>
  let mockBookingRepo: jest.Mocked<BookingRepository>

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    venue_id: 'venue-123',
    renter_id: 'user-123',
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
    renter_id: 'user-123',
    venue_id: 'venue-123',
    amount: 100,
    platform_fee: 0,
    venue_owner_amount: 100,
    status: 'pending',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  })

  // Helper to set up Supabase venue + user lookup mocks
  function mockSupabaseLookups({
    venue,
    venueError = null,
    user = { is_admin: false },
    userError = null,
  }: {
    venue: Venue | null
    venueError?: { message: string } | null
    user?: { is_admin: boolean } | null
    userError?: { message: string } | null
  }) {
    const venueSingleFn = jest.fn().mockResolvedValue({ data: venue, error: venueError })
    const venueEqFn = jest.fn().mockReturnValue({ single: venueSingleFn })
    const venueSelectFn = jest.fn().mockReturnValue({ eq: venueEqFn })

    const userSingleFn = jest.fn().mockResolvedValue({ data: user, error: userError })
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

  it('should return clientSecret, paymentId, and amount on success', async () => {
    const booking = createBooking({ total_amount: 75 })
    const venue = createVenue({ instant_booking: true, insurance_required: false })
    const payment = createPayment({ id: 'payment-456', amount: 75 })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockPaymentRepo.create = jest.fn().mockResolvedValue(payment)
    mockSupabaseLookups({ venue })

    ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    })

    const result = await paymentService.createPaymentIntent('booking-123', 'user-123')

    expect(result).toEqual({
      clientSecret: 'pi_test_123_secret_abc',
      paymentId: 'payment-456',
      amount: 75,
    })
  })

  it('should call stripe.paymentIntents.create with correct amount in cents, currency, and metadata', async () => {
    const booking = createBooking({ total_amount: 99.50 })
    const venue = createVenue()

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockPaymentRepo.create = jest.fn().mockResolvedValue(createPayment())
    mockSupabaseLookups({ venue })

    ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    })

    await paymentService.createPaymentIntent('booking-123', 'user-123')

    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
      amount: 9950, // $99.50 * 100
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        booking_id: 'booking-123',
        venue_id: 'venue-123',
        renter_id: 'user-123',
      },
    })
  })

  it('should create a new payment record when none exists', async () => {
    const booking = createBooking()
    const venue = createVenue()

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockPaymentRepo.create = jest.fn().mockResolvedValue(createPayment())
    mockSupabaseLookups({ venue })

    ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    })

    await paymentService.createPaymentIntent('booking-123', 'user-123')

    expect(mockPaymentRepo.create).toHaveBeenCalledWith({
      booking_id: 'booking-123',
      renter_id: 'user-123',
      venue_id: 'venue-123',
      amount: 100,
      platform_fee: 0,
      venue_owner_amount: 100,
      stripe_payment_intent_id: 'pi_test_123',
      status: 'pending',
    })
    expect(mockPaymentRepo.update).not.toHaveBeenCalled()
  })

  it('should update existing payment record when one exists (re-attempt)', async () => {
    const booking = createBooking()
    const venue = createVenue()
    const existingPayment = createPayment({ id: 'existing-pay-1', status: 'pending' })
    const updatedPayment = createPayment({ id: 'existing-pay-1', stripe_payment_intent_id: 'pi_test_new' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(existingPayment)
    mockPaymentRepo.update = jest.fn().mockResolvedValue(updatedPayment)
    mockSupabaseLookups({ venue })

    ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_test_new',
      client_secret: 'pi_test_new_secret',
    })

    await paymentService.createPaymentIntent('booking-123', 'user-123')

    expect(mockPaymentRepo.update).toHaveBeenCalledWith('existing-pay-1', {
      stripe_payment_intent_id: 'pi_test_new',
      status: 'pending',
    })
    expect(mockPaymentRepo.create).not.toHaveBeenCalled()
  })

  it('should throw "Booking not found" when booking does not exist', async () => {
    mockBookingRepo.findById = jest.fn().mockResolvedValue(null)

    await expect(
      paymentService.createPaymentIntent('nonexistent', 'user-123')
    ).rejects.toMatchObject({
      message: 'Booking not found',
      statusCode: 404,
    })
  })

  it('should allow venue owner to create payment intent for a booking they do not rent', async () => {
    const booking = createBooking({ renter_id: 'renter-456' })
    const venue = createVenue({ owner_id: 'owner-123' })
    const payment = createPayment({ renter_id: 'renter-456' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockPaymentRepo.create = jest.fn().mockResolvedValue(payment)
    mockSupabaseLookups({ venue })

    ;(stripe.paymentIntents.create as jest.Mock).mockResolvedValue({
      id: 'pi_test_owner',
      client_secret: 'pi_test_owner_secret',
    })

    const result = await paymentService.createPaymentIntent('booking-123', 'owner-123')

    expect(result).toEqual({
      clientSecret: 'pi_test_owner_secret',
      paymentId: 'payment-123',
      amount: 100,
    })
  })

  it('should reject user who is not renter, venue owner, or admin', async () => {
    const booking = createBooking({ renter_id: 'renter-456' })
    const venue = createVenue({ owner_id: 'owner-123' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockSupabaseLookups({ venue, user: { is_admin: false } })

    await expect(
      paymentService.createPaymentIntent('booking-123', 'outsider-123')
    ).rejects.toMatchObject({
      message: 'You do not have permission to pay for this booking',
      statusCode: 400,
    })
  })

  it('should throw error for cancelled bookings', async () => {
    const booking = createBooking({ status: 'cancelled' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(
      paymentService.createPaymentIntent('booking-123', 'user-123')
    ).rejects.toMatchObject({
      message: 'Cannot pay for a cancelled booking',
      statusCode: 400,
    })
  })

  it('should throw error for completed bookings', async () => {
    const booking = createBooking({ status: 'completed' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(
      paymentService.createPaymentIntent('booking-123', 'user-123')
    ).rejects.toMatchObject({
      message: 'This booking is already completed',
      statusCode: 400,
    })
  })

  it('should throw "already been paid" when existing payment is paid', async () => {
    const booking = createBooking()
    const existingPayment = createPayment({ status: 'paid' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(existingPayment)

    await expect(
      paymentService.createPaymentIntent('booking-123', 'user-123')
    ).rejects.toMatchObject({
      message: 'This booking has already been paid',
      statusCode: 400,
    })
  })

  it('should throw "Venue not found" when venue lookup fails', async () => {
    const booking = createBooking()

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockSupabaseLookups({ venue: null, venueError: { message: 'not found' } })

    await expect(
      paymentService.createPaymentIntent('booking-123', 'user-123')
    ).rejects.toMatchObject({
      message: 'Venue not found',
      statusCode: 404,
    })
  })

  it('should throw "Insurance must be approved" when insurance required but not approved', async () => {
    const booking = createBooking({ insurance_approved: false })
    const venue = createVenue({ instant_booking: true, insurance_required: true })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentRepo.findByBookingId = jest.fn().mockResolvedValue(null)
    mockSupabaseLookups({ venue })

    await expect(
      paymentService.createPaymentIntent('booking-123', 'user-123')
    ).rejects.toMatchObject({
      message: 'Insurance must be approved before payment',
      statusCode: 400,
    })
  })
})
