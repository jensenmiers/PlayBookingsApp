/**
 * Unit tests for PaymentService
 */

import { PaymentService } from '../paymentService'
import type { Booking, Venue } from '@/types'

// Mock the stripe library
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    refunds: {
      create: jest.fn(),
    },
  },
}))

// Mock the repositories
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

describe('PaymentService', () => {
  let paymentService: PaymentService

  beforeEach(() => {
    paymentService = new PaymentService()
    jest.clearAllMocks()
  })

  describe('isBookingReadyForPayment', () => {
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
      instant_booking: true,
      insurance_required: false,
      max_advance_booking_days: 180,
      photos: [],
      amenities: [],
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('should return true for instant booking without insurance', () => {
      const booking = createBooking()
      const venue = createVenue({ instant_booking: true, insurance_required: false })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(true)
    })

    it('should return true for instant booking with approved insurance', () => {
      const booking = createBooking({ insurance_approved: true })
      const venue = createVenue({ instant_booking: true, insurance_required: true })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(true)
    })

    it('should return false for instant booking with unapproved insurance', () => {
      const booking = createBooking({ insurance_approved: false })
      const venue = createVenue({ instant_booking: true, insurance_required: true })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(false)
    })

    it('should return true for non-instant booking without insurance', () => {
      const booking = createBooking()
      const venue = createVenue({ instant_booking: false, insurance_required: false })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(true)
    })

    it('should return true for non-instant booking with approved insurance', () => {
      const booking = createBooking({ insurance_approved: true })
      const venue = createVenue({ instant_booking: false, insurance_required: true })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(true)
    })

    it('should return false for non-instant booking with unapproved insurance', () => {
      const booking = createBooking({ insurance_approved: false })
      const venue = createVenue({ instant_booking: false, insurance_required: true })

      const result = paymentService.isBookingReadyForPayment(booking, venue)

      expect(result).toBe(false)
    })
  })

  describe('requiresImmediatePayment', () => {
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
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('should return true for instant booking without insurance', () => {
      const venue = createVenue({ instant_booking: true, insurance_required: false })

      const result = paymentService.requiresImmediatePayment(venue)

      expect(result).toBe(true)
    })

    it('should return false for instant booking with insurance required', () => {
      const venue = createVenue({ instant_booking: true, insurance_required: true })

      const result = paymentService.requiresImmediatePayment(venue)

      expect(result).toBe(false)
    })

    it('should return false for non-instant booking', () => {
      const venue = createVenue({ instant_booking: false, insurance_required: false })

      const result = paymentService.requiresImmediatePayment(venue)

      expect(result).toBe(false)
    })

    it('should return false for non-instant booking with insurance', () => {
      const venue = createVenue({ instant_booking: false, insurance_required: true })

      const result = paymentService.requiresImmediatePayment(venue)

      expect(result).toBe(false)
    })
  })
})
