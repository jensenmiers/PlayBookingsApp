import type { BookingWithVenue } from '@/types'

jest.mock('@/repositories/bookingRepository')
jest.mock('@/repositories/availabilityRepository')
jest.mock('../auditService')
jest.mock('../paymentService')
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
import { BookingRepository } from '@/repositories/bookingRepository'
import { createClient } from '@/lib/supabase/server'

describe('BookingService.listBookings - time_view filtering', () => {
  let bookingService: BookingService
  let mockBookingRepo: jest.Mocked<BookingRepository>

  const createBooking = (overrides: Partial<BookingWithVenue> = {}): BookingWithVenue => ({
    id: 'booking-1',
    venue_id: 'venue-1',
    renter_id: 'user-1',
    date: '2026-02-19',
    start_time: '16:00:00',
    end_time: '17:00:00',
    status: 'pending',
    total_amount: 100,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    venue: {
      id: 'venue-1',
      name: 'Test Venue',
      instant_booking: true,
      insurance_required: false,
    },
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 19, 15, 0, 0))

    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                is_admin: false,
                is_renter: true,
                is_venue_owner: false,
              },
              error: null,
            }),
          }
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    })

    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns only upcoming bookings when time_view=upcoming', async () => {
    const startedToday = createBooking({
      id: 'booking-started',
      date: '2026-02-19',
      start_time: '14:00:00',
      status: 'pending',
    })
    const laterToday = createBooking({
      id: 'booking-later',
      date: '2026-02-19',
      start_time: '16:00:00',
      status: 'pending',
    })

    mockBookingRepo.findByRenterWithVenue = jest
      .fn()
      .mockResolvedValue([startedToday, laterToday])

    const result = await bookingService.listBookings(
      {
        role_view: 'renter',
        time_view: 'upcoming',
      },
      'user-1'
    )

    expect((result as BookingWithVenue[]).map((booking) => booking.id)).toEqual(['booking-later'])
  })

  it('returns only past bookings when time_view=past', async () => {
    const startedToday = createBooking({
      id: 'booking-started',
      date: '2026-02-19',
      start_time: '14:00:00',
      status: 'pending',
    })
    const laterToday = createBooking({
      id: 'booking-later',
      date: '2026-02-19',
      start_time: '16:00:00',
      status: 'pending',
    })

    mockBookingRepo.findByRenterWithVenue = jest
      .fn()
      .mockResolvedValue([startedToday, laterToday])

    const result = await bookingService.listBookings(
      {
        role_view: 'renter',
        time_view: 'past',
      },
      'user-1'
    )

    expect((result as BookingWithVenue[]).map((booking) => booking.id)).toEqual(['booking-started'])
  })
})
