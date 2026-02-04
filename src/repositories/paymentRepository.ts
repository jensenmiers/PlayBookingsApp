/**
 * Payment repository for data access
 */

import { createClient } from '@/lib/supabase/server'
import type { Payment, PaymentStatus } from '@/types'

export interface CreatePaymentData {
  booking_id: string
  renter_id: string
  venue_id: string
  amount: number
  platform_fee: number
  venue_owner_amount: number
  stripe_payment_intent_id?: string
  status?: PaymentStatus
}

export interface UpdatePaymentData {
  stripe_payment_intent_id?: string
  stripe_transfer_id?: string
  status?: PaymentStatus
  paid_at?: string
  refunded_at?: string
  refund_amount?: number
}

export class PaymentRepository {
  /**
   * Create a new payment record
   */
  async create(data: CreatePaymentData): Promise<Payment> {
    const supabase = await createClient()
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        ...data,
        status: data.status || 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    return payment as Payment
  }

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    return data as Payment
  }

  /**
   * Find payment by booking ID
   */
  async findByBookingId(bookingId: string): Promise<Payment | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    return data as Payment
  }

  /**
   * Find payment by Stripe payment intent ID (for webhook idempotency)
   */
  async findByStripePaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    return data as Payment
  }

  /**
   * Update payment
   */
  async update(id: string, updates: UpdatePaymentData): Promise<Payment> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`)
    }

    return data as Payment
  }

  /**
   * Find payments by renter
   */
  async findByRenter(renterId: string): Promise<Payment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('renter_id', renterId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return (data || []) as Payment[]
  }

  /**
   * Find payments by venue
   */
  async findByVenue(venueId: string): Promise<Payment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return (data || []) as Payment[]
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return (data || []) as Payment[]
  }
}
