import { BookingService } from '@/services/bookingService'
import { createClient } from '@/lib/supabase/server'
import type { Booking } from '@/types'

jest.mock('@/repositories/bookingRepository')
jest.mock('@/services/auditService')
jest.mock('@/services/paymentService')
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

const pendingBooking: Booking = {
  id: 'booking-123',
  venue_id: 'venue-123',
  renter_id: 'renter-123',
  date: '2026-08-05',
  start_time: '18:30:00',
  end_time: '20:00:00',
  status: 'pending',
  total_amount: 175,
  insurance_approved: true,
  insurance_required: false,
  recurring_type: 'none',
  created_at: '2026-07-25T00:00:00.000Z',
  updated_at: '2026-07-25T00:00:00.000Z',
}

describe('BookingService confirmed-payment email recovery', () => {
  it('sends the confirmation when an owner confirms a booking that is already paid', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                owner_id: 'owner-123',
                insurance_required: false,
                instant_booking: false,
              },
              error: null,
            }),
          }
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { is_admin: false },
            error: null,
          }),
        }
      }),
    })

    const bookingService = new BookingService()
    const bookingRepo = (bookingService as unknown as {
      bookingRepo: {
        findById: jest.Mock
        update: jest.Mock
      }
    }).bookingRepo
    const paymentService = (bookingService as unknown as {
      paymentService: {
        getPaymentByBookingId: jest.Mock
      }
    }).paymentService
    const auditService = (bookingService as unknown as {
      auditService: {
        logUpdate: jest.Mock
      }
    }).auditService
    const bookingConfirmationEmailService = {
      sendIfNeeded: jest.fn().mockResolvedValue({
        status: 'sent',
        emailId: 'email-123',
      }),
    }
    ;(bookingService as unknown as {
      bookingConfirmationEmailService: typeof bookingConfirmationEmailService
    }).bookingConfirmationEmailService = bookingConfirmationEmailService

    bookingRepo.findById.mockResolvedValue(pendingBooking)
    bookingRepo.update.mockResolvedValue({
      ...pendingBooking,
      status: 'confirmed',
    })
    paymentService.getPaymentByBookingId.mockResolvedValue({
      id: 'payment-123',
      status: 'paid',
    })
    auditService.logUpdate.mockResolvedValue(undefined)

    await expect(
      bookingService.confirmBooking('booking-123', 'owner-123')
    ).resolves.toMatchObject({
      status: 'confirmed',
      requiresPayment: false,
    })

    expect(bookingConfirmationEmailService.sendIfNeeded).toHaveBeenCalledWith(
      'booking-123'
    )
  })

  it('returns the confirmed booking when email delivery fails after the database update', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                owner_id: 'owner-123',
                insurance_required: false,
                instant_booking: false,
              },
              error: null,
            }),
          }
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { is_admin: false },
            error: null,
          }),
        }
      }),
    })

    const bookingService = new BookingService()
    const bookingRepo = (bookingService as unknown as {
      bookingRepo: {
        findById: jest.Mock
        update: jest.Mock
      }
    }).bookingRepo
    const paymentService = (bookingService as unknown as {
      paymentService: {
        getPaymentByBookingId: jest.Mock
      }
    }).paymentService
    const auditService = (bookingService as unknown as {
      auditService: {
        logUpdate: jest.Mock
      }
    }).auditService
    const bookingConfirmationEmailService = {
      sendIfNeeded: jest.fn().mockRejectedValue(new Error('Resend unavailable')),
    }
    ;(bookingService as unknown as {
      bookingConfirmationEmailService: typeof bookingConfirmationEmailService
    }).bookingConfirmationEmailService = bookingConfirmationEmailService

    bookingRepo.findById.mockResolvedValue(pendingBooking)
    bookingRepo.update.mockResolvedValue({
      ...pendingBooking,
      status: 'confirmed',
    })
    paymentService.getPaymentByBookingId.mockResolvedValue({
      id: 'payment-123',
      status: 'paid',
    })
    auditService.logUpdate.mockResolvedValue(undefined)

    await expect(
      bookingService.confirmBooking('booking-123', 'owner-123')
    ).resolves.toMatchObject({
      status: 'confirmed',
      requiresPayment: false,
    })
    expect(consoleError).toHaveBeenCalledWith(
      'Booking confirmation email failed after owner confirmation',
      expect.any(Error)
    )
    consoleError.mockRestore()
  })
})
