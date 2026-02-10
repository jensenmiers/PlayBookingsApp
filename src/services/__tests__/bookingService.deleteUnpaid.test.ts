/**
 * Unit tests for BookingService.deleteUnpaidBooking
 * Tests the payment abandonment flow - hard deleting unpaid bookings
 */

import type { Booking, Payment } from '@/types'

// Mock dependencies before importing BookingService
jest.mock('@/repositories/bookingRepository')
jest.mock('@/repositories/availabilityRepository')
jest.mock('../auditService')
jest.mock('../paymentService')
jest.mock('@/lib/stripe', () => ({
  stripe: {
    setupIntents: { cancel: jest.fn() },
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { BookingService } from '../bookingService'
import { BookingRepository } from '@/repositories/bookingRepository'
import { PaymentService } from '../paymentService'
import { AuditService } from '../auditService'

describe('BookingService - deleteUnpaidBooking', () => {
  let bookingService: BookingService
  let mockBookingRepo: jest.Mocked<BookingRepository>
  let mockPaymentService: jest.Mocked<PaymentService>
  let mockAuditService: jest.Mocked<AuditService>

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

    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
    mockPaymentService = (bookingService as unknown as { paymentService: jest.Mocked<PaymentService> }).paymentService
    mockAuditService = (bookingService as unknown as { auditService: jest.Mocked<AuditService> }).auditService
  })

  it('should delete a pending booking owned by user', async () => {
    const booking = createBooking({ status: 'pending', renter_id: 'user-123' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(null)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
  })

  it('should throw NotFoundError for non-existent booking', async () => {
    mockBookingRepo.findById = jest.fn().mockResolvedValue(null)

    await expect(bookingService.deleteUnpaidBooking('nonexistent', 'user-123'))
      .rejects.toThrow('Booking not found')
  })

  it('should throw BadRequestError if user does not own booking', async () => {
    const booking = createBooking({ renter_id: 'other-user' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(bookingService.deleteUnpaidBooking('booking-123', 'user-123'))
      .rejects.toThrow('You do not have permission to delete this booking')
  })

  it('should throw BadRequestError for confirmed booking', async () => {
    const booking = createBooking({ status: 'confirmed' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(bookingService.deleteUnpaidBooking('booking-123', 'user-123'))
      .rejects.toThrow('Only pending bookings can be deleted')
  })

  it('should throw BadRequestError for cancelled booking', async () => {
    const booking = createBooking({ status: 'cancelled' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(bookingService.deleteUnpaidBooking('booking-123', 'user-123'))
      .rejects.toThrow('Only pending bookings can be deleted')
  })

  it('should throw BadRequestError for completed booking', async () => {
    const booking = createBooking({ status: 'completed' })
    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)

    await expect(bookingService.deleteUnpaidBooking('booking-123', 'user-123'))
      .rejects.toThrow('Only pending bookings can be deleted')
  })

  it('should throw BadRequestError if booking has paid payment', async () => {
    const booking = createBooking({ status: 'pending' })
    const payment = createPayment({ status: 'paid' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(payment)

    await expect(bookingService.deleteUnpaidBooking('booking-123', 'user-123'))
      .rejects.toThrow('Cannot delete a paid booking. Use cancel instead.')
  })

  it('should cancel authorized SetupIntent before deletion', async () => {
    const booking = createBooking({ status: 'pending' })
    const payment = createPayment({ status: 'authorized', stripe_setup_intent_id: 'seti_123' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(payment)
    mockPaymentService.cancelSetupIntent = jest.fn().mockResolvedValue(undefined)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockPaymentService.cancelSetupIntent).toHaveBeenCalledWith('booking-123', 'user-123')
    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
  })

  it('should not cancel SetupIntent if payment is pending (not authorized)', async () => {
    const booking = createBooking({ status: 'pending' })
    const payment = createPayment({ status: 'pending' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(payment)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockPaymentService.cancelSetupIntent).not.toHaveBeenCalled()
    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
  })

  it('should hard-delete the booking record', async () => {
    const booking = createBooking({ status: 'pending' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(null)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    // Verify delete was called (not update with cancelled status)
    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
    expect(mockBookingRepo.update).not.toHaveBeenCalled()
  })

  it('should log audit before deletion', async () => {
    const booking = createBooking({ status: 'pending' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(null)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockAuditService.logDelete).toHaveBeenCalledWith(
      'bookings',
      'booking-123',
      'user-123',
      expect.objectContaining({ id: 'booking-123' })
    )
    // Verify audit is called before delete
    const auditCallOrder = mockAuditService.logDelete.mock.invocationCallOrder[0]
    const deleteCallOrder = mockBookingRepo.delete.mock.invocationCallOrder[0]
    expect(auditCallOrder).toBeLessThan(deleteCallOrder)
  })

  it('should delete booking even if no payment exists', async () => {
    const booking = createBooking({ status: 'pending' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(null)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
  })

  it('should allow deletion if payment exists but is failed', async () => {
    const booking = createBooking({ status: 'pending' })
    const payment = createPayment({ status: 'failed' })

    mockBookingRepo.findById = jest.fn().mockResolvedValue(booking)
    mockPaymentService.getPaymentByBookingId = jest.fn().mockResolvedValue(payment)
    mockAuditService.logDelete = jest.fn().mockResolvedValue(undefined)
    mockBookingRepo.delete = jest.fn().mockResolvedValue(undefined)

    await bookingService.deleteUnpaidBooking('booking-123', 'user-123')

    expect(mockBookingRepo.delete).toHaveBeenCalledWith('booking-123')
  })
})
