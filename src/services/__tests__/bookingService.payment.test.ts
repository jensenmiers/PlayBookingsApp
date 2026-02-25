/**
 * Unit tests for BookingService payment flow
 */

import type { Venue } from '@/types'

// Mock the dependencies before importing BookingService
jest.mock('@/repositories/bookingRepository')
jest.mock('@/repositories/availabilityRepository')
jest.mock('../auditService')
jest.mock('../paymentService')
jest.mock('@/utils/conflictDetection', () => ({
  checkBookingConflicts: jest.fn().mockReturnValue({ hasConflict: false }),
}))
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { BookingService } from '../bookingService'
import { createClient } from '@/lib/supabase/server'
import { BookingRepository } from '@/repositories/bookingRepository'

describe('BookingService - Payment Flow', () => {
  let bookingService: BookingService
  let mockSupabase: {
    from: jest.Mock
  }
  let mockBookingRepo: jest.Mocked<BookingRepository>

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

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
    }
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
          }
        }
        return mockSupabase
      }),
    })

    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
  })

  describe('createBooking - Payment Flags', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const bookingData = {
      venue_id: 'venue-123',
      date: futureDate.toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '12:00:00',
    }

    it('should return requiresImmediatePayment=true for instant booking without insurance', async () => {
      const venue = createVenue({ instant_booking: true, insurance_required: false })
      const mockBooking = {
        id: 'booking-123',
        ...bookingData,
        renter_id: 'user-123',
        status: 'pending' as const,
        total_amount: 100,
        insurance_approved: true,
        insurance_required: false,
        recurring_type: 'none' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Setup mocks
      const supabaseClient = await createClient()
      ;(supabaseClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: venue, error: null }),
          }
        }
        if (table === 'venue_admin_configs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return mockSupabase
      })

      mockBookingRepo.create = jest.fn().mockResolvedValue(mockBooking)
      mockBookingRepo.findConflictingBookings = jest.fn().mockResolvedValue([])
      mockBookingRepo.findConflictingRecurring = jest.fn().mockResolvedValue([])

      // Mock availability repo
      const availabilityRepo = (bookingService as unknown as { availabilityRepo: { findByVenueAndDate: jest.Mock } }).availabilityRepo
      availabilityRepo.findByVenueAndDate = jest.fn().mockResolvedValue([])

      // Mock audit service
      const auditService = (bookingService as unknown as { auditService: { logCreate: jest.Mock } }).auditService
      auditService.logCreate = jest.fn().mockResolvedValue(undefined)

      const result = await bookingService.createBooking(bookingData, 'user-123')

      expect(result.requiresImmediatePayment).toBe(true)
      expect(result.awaitingOwnerApproval).toBe(false)
      expect(result.awaitingInsuranceApproval).toBe(false)
    })

    it('should return awaitingOwnerApproval=true for non-instant booking', async () => {
      const venue = createVenue({ instant_booking: false, insurance_required: false })
      const mockBooking = {
        id: 'booking-123',
        ...bookingData,
        renter_id: 'user-123',
        status: 'pending' as const,
        total_amount: 100,
        insurance_approved: true,
        insurance_required: false,
        recurring_type: 'none' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const supabaseClient = await createClient()
      ;(supabaseClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: venue, error: null }),
          }
        }
        if (table === 'venue_admin_configs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return mockSupabase
      })

      mockBookingRepo.create = jest.fn().mockResolvedValue(mockBooking)
      mockBookingRepo.findConflictingBookings = jest.fn().mockResolvedValue([])
      mockBookingRepo.findConflictingRecurring = jest.fn().mockResolvedValue([])

      const availabilityRepo = (bookingService as unknown as { availabilityRepo: { findByVenueAndDate: jest.Mock } }).availabilityRepo
      availabilityRepo.findByVenueAndDate = jest.fn().mockResolvedValue([])

      const auditService = (bookingService as unknown as { auditService: { logCreate: jest.Mock } }).auditService
      auditService.logCreate = jest.fn().mockResolvedValue(undefined)

      const result = await bookingService.createBooking(bookingData, 'user-123')

      expect(result.requiresImmediatePayment).toBe(false)
      expect(result.awaitingOwnerApproval).toBe(true)
    })

    it('should return awaitingInsuranceApproval=true when insurance required', async () => {
      const venue = createVenue({ instant_booking: true, insurance_required: true })
      const mockBooking = {
        id: 'booking-123',
        ...bookingData,
        renter_id: 'user-123',
        status: 'pending' as const,
        total_amount: 100,
        insurance_approved: false,
        insurance_required: true,
        recurring_type: 'none' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const supabaseClient = await createClient()
      ;(supabaseClient.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: venue, error: null }),
          }
        }
        if (table === 'venue_admin_configs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return mockSupabase
      })

      mockBookingRepo.create = jest.fn().mockResolvedValue(mockBooking)
      mockBookingRepo.findConflictingBookings = jest.fn().mockResolvedValue([])
      mockBookingRepo.findConflictingRecurring = jest.fn().mockResolvedValue([])

      const availabilityRepo = (bookingService as unknown as { availabilityRepo: { findByVenueAndDate: jest.Mock } }).availabilityRepo
      availabilityRepo.findByVenueAndDate = jest.fn().mockResolvedValue([])

      const auditService = (bookingService as unknown as { auditService: { logCreate: jest.Mock } }).auditService
      auditService.logCreate = jest.fn().mockResolvedValue(undefined)

      const result = await bookingService.createBooking(bookingData, 'user-123')

      expect(result.requiresImmediatePayment).toBe(false)
      expect(result.awaitingInsuranceApproval).toBe(true)
    })
  })
})
