/**
 * Unit tests for PaymentRepository
 * Tests the findByStripeSetupIntentId method for card-on-file authorization
 */

import { PaymentRepository } from '../paymentRepository'
import { createClient } from '@/lib/supabase/server'
import type { Payment } from '@/types'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('PaymentRepository', () => {
  let paymentRepo: PaymentRepository
  let mockSupabaseClient: {
    from: jest.Mock
  }

  // Test data factory
  const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 'payment-123',
    booking_id: 'booking-123',
    renter_id: 'user-123',
    venue_id: 'venue-123',
    amount: 100,
    platform_fee: 0,
    venue_owner_amount: 100,
    status: 'authorized',
    stripe_setup_intent_id: 'seti_123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    paymentRepo = new PaymentRepository()

    // Setup mock chain
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
    }
  })

  describe('findByStripeSetupIntentId', () => {
    it('should return payment when found', async () => {
      const payment = createPayment({ stripe_setup_intent_id: 'seti_abc123' })

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: payment, error: null }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.findByStripeSetupIntentId('seti_abc123')

      expect(result).toEqual(payment)
      expect(mockQuery.from).toHaveBeenCalledWith('payments')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('stripe_setup_intent_id', 'seti_abc123')
    })

    it('should return null when not found', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.findByStripeSetupIntentId('seti_nonexistent')

      expect(result).toBeNull()
    })

    it('should throw error on database error', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST500', message: 'Database connection error' },
        }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      await expect(paymentRepo.findByStripeSetupIntentId('seti_123'))
        .rejects.toThrow('Failed to fetch payment: Database connection error')
    })

    it('should query with correct setup intent ID', async () => {
      const payment = createPayment()
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: payment, error: null }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      await paymentRepo.findByStripeSetupIntentId('seti_specific_id')

      expect(mockQuery.eq).toHaveBeenCalledWith('stripe_setup_intent_id', 'seti_specific_id')
    })
  })

  describe('findByBookingId', () => {
    it('should return payment when found', async () => {
      const payment = createPayment({ booking_id: 'booking-456' })

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: payment, error: null }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.findByBookingId('booking-456')

      expect(result).toEqual(payment)
      expect(mockQuery.eq).toHaveBeenCalledWith('booking_id', 'booking-456')
    })

    it('should return null when not found', async () => {
      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Row not found' },
        }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.findByBookingId('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create payment with stripe_setup_intent_id', async () => {
      const paymentData = {
        booking_id: 'booking-123',
        renter_id: 'user-123',
        venue_id: 'venue-123',
        amount: 150,
        platform_fee: 0,
        venue_owner_amount: 150,
        stripe_setup_intent_id: 'seti_new',
        status: 'authorized' as const,
      }
      const createdPayment = createPayment({ ...paymentData, id: 'payment-new' })

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: createdPayment, error: null }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.create(paymentData)

      expect(result).toEqual(createdPayment)
      expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        stripe_setup_intent_id: 'seti_new',
        status: 'authorized',
      }))
    })
  })

  describe('update', () => {
    it('should update payment with stripe_setup_intent_id', async () => {
      const updatedPayment = createPayment({
        stripe_setup_intent_id: 'seti_updated',
        status: 'authorized',
      })

      const mockQuery = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updatedPayment, error: null }),
      }
      ;(createClient as jest.Mock).mockResolvedValue(mockQuery)

      const result = await paymentRepo.update('payment-123', {
        stripe_setup_intent_id: 'seti_updated',
        status: 'authorized',
      })

      expect(result).toEqual(updatedPayment)
      expect(mockQuery.update).toHaveBeenCalledWith({
        stripe_setup_intent_id: 'seti_updated',
        status: 'authorized',
      })
    })
  })
})
