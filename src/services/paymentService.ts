/**
 * Payment service with Stripe integration for one-time booking payments
 */

import { stripe } from '@/lib/stripe'
import { PaymentRepository } from '@/repositories/paymentRepository'
import { BookingRepository } from '@/repositories/bookingRepository'
import { createClient } from '@/lib/supabase/server'
import { badRequest, notFound } from '@/utils/errorHandling'
import type { Booking, Venue, Payment } from '@/types'

export interface CheckoutSessionResult {
  url: string
  sessionId: string
  paymentId: string
}

export interface RefundResult {
  refundId: string
  amount: number
  status: string
}

export interface PaymentIntentResult {
  clientSecret: string
  paymentId: string
  amount: number
}

export interface SetupIntentResult {
  clientSecret: string
  paymentId: string
  amount: number
  setupIntentId: string
}

export interface CapturePaymentResult {
  paymentId: string
  paymentIntentId: string
  amount: number
  status: 'paid' | 'failed'
}

export class PaymentService {
  private paymentRepo = new PaymentRepository()
  private bookingRepo = new BookingRepository()

  /**
   * Check if a booking is ready for payment based on venue settings
   */
  isBookingReadyForPayment(booking: Booking, venue: Venue): boolean {
    // Instant booking without insurance requirement - ready immediately
    if (venue.instant_booking && !venue.insurance_required) {
      return true
    }

    // Instant booking with insurance - must be approved
    if (venue.instant_booking && venue.insurance_required) {
      return booking.insurance_approved
    }

    // Non-instant booking without insurance - ready after owner confirms (status check elsewhere)
    if (!venue.instant_booking && !venue.insurance_required) {
      return true
    }

    // Non-instant booking with insurance - must be approved
    if (!venue.instant_booking && venue.insurance_required) {
      return booking.insurance_approved
    }

    return false
  }

  /**
   * Check if booking requires immediate payment (instant booking, no insurance)
   */
  requiresImmediatePayment(venue: Venue): boolean {
    return venue.instant_booking && !venue.insurance_required
  }

  /**
   * Create a Stripe Checkout Session for a booking
   */
  async createCheckoutSession(
    bookingId: string,
    userId: string,
    baseUrl: string
  ): Promise<CheckoutSessionResult> {
    const supabase = await createClient()

    // Fetch booking
    const booking = await this.bookingRepo.findById(bookingId)
    if (!booking) {
      throw notFound('Booking not found')
    }

    // Verify user owns the booking
    if (booking.renter_id !== userId) {
      throw badRequest('You do not have permission to pay for this booking')
    }

    // Check booking status
    if (booking.status === 'cancelled') {
      throw badRequest('Cannot pay for a cancelled booking')
    }

    if (booking.status === 'completed') {
      throw badRequest('This booking is already completed')
    }

    // Check if already paid
    const existingPayment = await this.paymentRepo.findByBookingId(bookingId)
    if (existingPayment?.status === 'paid') {
      throw badRequest('This booking has already been paid')
    }

    // Fetch venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', booking.venue_id)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    // Check if booking is ready for payment
    if (!this.isBookingReadyForPayment(booking, venue)) {
      if (venue.insurance_required && !booking.insurance_approved) {
        throw badRequest('Insurance must be approved before payment')
      }
      throw badRequest('Booking is not ready for payment')
    }

    // Calculate amounts (0% platform fee for MVP)
    const amount = booking.total_amount
    const platformFee = 0
    const venueOwnerAmount = amount

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Booking at ${venue.name}`,
              description: `${booking.date} from ${booking.start_time} to ${booking.end_time}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        venue_id: booking.venue_id,
        renter_id: userId,
      },
      success_url: `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/booking/cancelled?booking_id=${bookingId}`,
    })

    // Create or update payment record
    let payment: Payment
    if (existingPayment) {
      payment = await this.paymentRepo.update(existingPayment.id, {
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'pending',
      })
    } else {
      payment = await this.paymentRepo.create({
        booking_id: bookingId,
        renter_id: userId,
        venue_id: booking.venue_id,
        amount,
        platform_fee: platformFee,
        venue_owner_amount: venueOwnerAmount,
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'pending',
      })
    }

    return {
      url: session.url!,
      sessionId: session.id,
      paymentId: payment.id,
    }
  }

  /**
   * Create a Stripe PaymentIntent for embedded payment flow
   */
  async createPaymentIntent(
    bookingId: string,
    userId: string
  ): Promise<PaymentIntentResult> {
    const supabase = await createClient()

    // Fetch booking
    const booking = await this.bookingRepo.findById(bookingId)
    if (!booking) {
      throw notFound('Booking not found')
    }

    // Verify user owns the booking
    if (booking.renter_id !== userId) {
      throw badRequest('You do not have permission to pay for this booking')
    }

    // Check booking status
    if (booking.status === 'cancelled') {
      throw badRequest('Cannot pay for a cancelled booking')
    }

    if (booking.status === 'completed') {
      throw badRequest('This booking is already completed')
    }

    // Check if already paid
    const existingPayment = await this.paymentRepo.findByBookingId(bookingId)
    if (existingPayment?.status === 'paid') {
      throw badRequest('This booking has already been paid')
    }

    // Fetch venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', booking.venue_id)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    // Check if booking is ready for payment
    if (!this.isBookingReadyForPayment(booking, venue)) {
      if (venue.insurance_required && !booking.insurance_approved) {
        throw badRequest('Insurance must be approved before payment')
      }
      throw badRequest('Booking is not ready for payment')
    }

    // Calculate amounts (0% platform fee for MVP)
    const amount = booking.total_amount
    const platformFee = 0
    const venueOwnerAmount = amount

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        booking_id: bookingId,
        venue_id: booking.venue_id,
        renter_id: userId,
      },
    })

    // Create or update payment record
    let payment: Payment
    if (existingPayment) {
      payment = await this.paymentRepo.update(existingPayment.id, {
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
    } else {
      payment = await this.paymentRepo.create({
        booking_id: bookingId,
        renter_id: userId,
        venue_id: booking.venue_id,
        amount,
        platform_fee: platformFee,
        venue_owner_amount: venueOwnerAmount,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
    }

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: payment.id,
      amount,
    }
  }

  /**
   * Create a Stripe SetupIntent for deferred payment (card on file)
   * Used for bookings that require approval before charging
   */
  async createSetupIntent(
    bookingId: string,
    userId: string
  ): Promise<SetupIntentResult> {
    const supabase = await createClient()

    // Fetch booking
    const booking = await this.bookingRepo.findById(bookingId)
    if (!booking) {
      throw notFound('Booking not found')
    }

    // Verify user owns the booking
    if (booking.renter_id !== userId) {
      throw badRequest('You do not have permission to pay for this booking')
    }

    // Check booking status
    if (booking.status === 'cancelled') {
      throw badRequest('Cannot authorize payment for a cancelled booking')
    }

    if (booking.status === 'completed') {
      throw badRequest('This booking is already completed')
    }

    // Check if already paid or authorized
    const existingPayment = await this.paymentRepo.findByBookingId(bookingId)
    if (existingPayment?.status === 'paid') {
      throw badRequest('This booking has already been paid')
    }
    if (existingPayment?.status === 'authorized') {
      throw badRequest('Payment has already been authorized for this booking')
    }

    // Fetch venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', booking.venue_id)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    // Calculate amounts (0% platform fee for MVP)
    const amount = booking.total_amount
    const platformFee = 0
    const venueOwnerAmount = amount

    // Create Stripe SetupIntent - this authorizes the card without charging
    const setupIntent = await stripe.setupIntents.create({
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        booking_id: bookingId,
        venue_id: booking.venue_id,
        renter_id: userId,
        amount: Math.round(amount * 100).toString(), // Store amount in cents for later capture
      },
    })

    // Create or update payment record with authorized status
    let payment: Payment
    if (existingPayment) {
      payment = await this.paymentRepo.update(existingPayment.id, {
        stripe_setup_intent_id: setupIntent.id,
        status: 'authorized',
      })
    } else {
      payment = await this.paymentRepo.create({
        booking_id: bookingId,
        renter_id: userId,
        venue_id: booking.venue_id,
        amount,
        platform_fee: platformFee,
        venue_owner_amount: venueOwnerAmount,
        stripe_setup_intent_id: setupIntent.id,
        status: 'authorized',
      })
    }

    return {
      clientSecret: setupIntent.client_secret!,
      paymentId: payment.id,
      amount,
      setupIntentId: setupIntent.id,
    }
  }

  /**
   * Capture payment for an authorized booking (charge the card on file)
   * Called after owner approval or insurance approval
   */
  async capturePayment(
    bookingId: string,
    initiatorId: string
  ): Promise<CapturePaymentResult> {
    const supabase = await createClient()

    // Find the payment with setup intent
    const payment = await this.paymentRepo.findByBookingId(bookingId)
    if (!payment) {
      throw notFound('No payment found for this booking')
    }

    if (payment.status === 'paid') {
      throw badRequest('This booking has already been paid')
    }

    if (payment.status !== 'authorized') {
      throw badRequest('Payment must be authorized before capturing')
    }

    if (!payment.stripe_setup_intent_id) {
      throw badRequest('No setup intent found for this payment')
    }

    // Get the setup intent to retrieve the payment method
    const setupIntent = await stripe.setupIntents.retrieve(payment.stripe_setup_intent_id)
    if (!setupIntent.payment_method) {
      throw badRequest('No payment method found for this setup intent')
    }

    // Fetch booking for metadata
    const booking = await this.bookingRepo.findById(bookingId)
    if (!booking) {
      throw notFound('Booking not found')
    }

    // Create and confirm a PaymentIntent using the saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payment.amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: setupIntent.payment_method as string,
      confirm: true,
      off_session: true, // Charging without customer present
      metadata: {
        booking_id: bookingId,
        venue_id: payment.venue_id,
        renter_id: payment.renter_id,
        captured_by: initiatorId,
      },
    })

    if (paymentIntent.status === 'succeeded') {
      // Update payment record
      const updatedPayment = await this.paymentRepo.update(payment.id, {
        stripe_payment_intent_id: paymentIntent.id,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })

      // Update booking status to confirmed
      await this.bookingRepo.update(bookingId, {
        status: 'confirmed',
      })

      return {
        paymentId: updatedPayment.id,
        paymentIntentId: paymentIntent.id,
        amount: payment.amount,
        status: 'paid',
      }
    } else {
      // Payment failed
      await this.paymentRepo.update(payment.id, {
        stripe_payment_intent_id: paymentIntent.id,
        status: 'failed',
      })

      return {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount: payment.amount,
        status: 'failed',
      }
    }
  }

  /**
   * Cancel an authorized payment (release the card hold)
   */
  async cancelSetupIntent(bookingId: string, userId: string): Promise<void> {
    const payment = await this.paymentRepo.findByBookingId(bookingId)
    if (!payment) {
      return // No payment to cancel
    }

    // Only cancel if authorized (not yet charged)
    if (payment.status !== 'authorized') {
      return
    }

    if (payment.stripe_setup_intent_id) {
      try {
        await stripe.setupIntents.cancel(payment.stripe_setup_intent_id)
      } catch {
        // Setup intent may already be cancelled or expired, continue with cleanup
      }
    }

    // Update payment status to failed/cancelled
    await this.paymentRepo.update(payment.id, {
      status: 'failed',
    })
  }

  /**
   * Process successful payment (called from webhook)
   */
  async processPaymentSuccess(
    paymentIntentId: string,
    checkoutSessionId?: string
  ): Promise<{ payment: Payment; booking: Booking }> {
    // Find payment by payment intent ID
    let payment = await this.paymentRepo.findByStripePaymentIntentId(paymentIntentId)

    // If not found by payment intent, try to get from checkout session metadata
    if (!payment && checkoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId)
      const bookingId = session.metadata?.booking_id
      if (bookingId) {
        payment = await this.paymentRepo.findByBookingId(bookingId)
      }
    }

    if (!payment) {
      throw notFound('Payment not found for this transaction')
    }

    // Check idempotency - already processed
    if (payment.status === 'paid') {
      const booking = await this.bookingRepo.findById(payment.booking_id)
      return { payment, booking: booking! }
    }

    // Update payment status
    const updatedPayment = await this.paymentRepo.update(payment.id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })

    // Update booking status to confirmed
    const booking = await this.bookingRepo.update(payment.booking_id, {
      status: 'confirmed',
    })

    return { payment: updatedPayment, booking }
  }

  /**
   * Process refund for a booking
   */
  async processRefund(
    bookingId: string,
    initiatorId: string,
    isOwnerInitiated: boolean
  ): Promise<RefundResult | null> {
    const payment = await this.paymentRepo.findByBookingId(bookingId)

    // No payment to refund
    if (!payment) {
      return null
    }

    // Can only refund paid payments (not pending, failed, or already refunded)
    if (payment.status !== 'paid') {
      return null
    }

    // Get the payment intent to issue refund
    if (!payment.stripe_payment_intent_id) {
      throw badRequest('No Stripe payment found for this booking')
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: isOwnerInitiated ? 'requested_by_customer' : 'requested_by_customer',
    })

    // Update payment record
    await this.paymentRepo.update(payment.id, {
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refund_amount: payment.amount,
    })

    return {
      refundId: refund.id,
      amount: payment.amount,
      status: refund.status || 'succeeded',
    }
  }

  /**
   * Handle charge.refunded webhook event
   */
  async processRefundWebhook(
    paymentIntentId: string,
    refundAmount: number
  ): Promise<Payment | null> {
    const payment = await this.paymentRepo.findByStripePaymentIntentId(paymentIntentId)

    if (!payment) {
      return null
    }

    // Already processed
    if (payment.status === 'refunded') {
      return payment
    }

    const updatedPayment = await this.paymentRepo.update(payment.id, {
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refund_amount: refundAmount / 100, // Convert from cents
    })

    return updatedPayment
  }

  /**
   * Get payment for a booking
   */
  async getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
    return this.paymentRepo.findByBookingId(bookingId)
  }
}
