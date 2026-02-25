import type { Availability, Venue } from '@/types'

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

type VenueAdminConfigRow = {
  venue_id: string
  min_advance_lead_time_hours: number
  same_day_cutoff_time: string | null
  blackout_dates: string[]
  holiday_dates: string[]
  operating_hours: Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>
}

describe('BookingService.createBooking - venue policy enforcement', () => {
  let bookingService: BookingService
  let mockBookingRepo: jest.Mocked<BookingRepository>

  const baseVenue: Venue = {
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
  }

  const baseAvailability: Availability[] = [
    {
      id: 'a1',
      venue_id: 'venue-123',
      date: '2026-02-25',
      start_time: '08:00:00',
      end_time: '22:00:00',
      is_available: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ]

  const makeSupabase = ({
    venue = baseVenue,
    adminConfig = null,
  }: {
    venue?: Venue | null
    adminConfig?: VenueAdminConfigRow | null
  }) => {
    return {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: venue, error: venue ? null : { message: 'not found' } }),
          }
        }

        if (table === 'venue_admin_configs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: adminConfig, error: null }),
          }
        }

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 25, 10, 0, 0))

    ;(createClient as jest.Mock).mockResolvedValue(makeSupabase({}))

    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo

    mockBookingRepo.findConflictingBookings = jest.fn().mockResolvedValue([])
    mockBookingRepo.findConflictingRecurring = jest.fn().mockResolvedValue([])
    mockBookingRepo.create = jest.fn().mockResolvedValue({
      id: 'booking-123',
      venue_id: 'venue-123',
      renter_id: 'user-123',
      date: '2026-02-26',
      start_time: '13:00:00',
      end_time: '14:00:00',
      status: 'pending',
      total_amount: 50,
      insurance_approved: true,
      insurance_required: false,
      recurring_type: 'none',
      created_at: '2026-02-25T10:00:00Z',
      updated_at: '2026-02-25T10:00:00Z',
    })

    const availabilityRepo = (bookingService as unknown as { availabilityRepo: { findByVenueAndDate: jest.Mock } }).availabilityRepo
    availabilityRepo.findByVenueAndDate = jest.fn().mockResolvedValue(baseAvailability)

    const auditService = (bookingService as unknown as { auditService: { logCreate: jest.Mock } }).auditService
    auditService.logCreate = jest.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects bookings that violate min_advance_lead_time_hours', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(
      makeSupabase({
        adminConfig: {
          venue_id: 'venue-123',
          min_advance_lead_time_hours: 2,
          same_day_cutoff_time: null,
          blackout_dates: [],
          holiday_dates: [],
          operating_hours: [],
        },
      })
    )

    await expect(
      bookingService.createBooking(
        {
          venue_id: 'venue-123',
          date: '2026-02-25',
          start_time: '11:00:00',
          end_time: '12:00:00',
        },
        'user-123'
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('lead time'),
      statusCode: 400,
    })
  })

  it('rejects same-day bookings after cutoff time', async () => {
    jest.setSystemTime(new Date(2026, 1, 25, 16, 30, 0))
    ;(createClient as jest.Mock).mockResolvedValue(
      makeSupabase({
        adminConfig: {
          venue_id: 'venue-123',
          min_advance_lead_time_hours: 0,
          same_day_cutoff_time: '15:00:00',
          blackout_dates: [],
          holiday_dates: [],
          operating_hours: [],
        },
      })
    )

    await expect(
      bookingService.createBooking(
        {
          venue_id: 'venue-123',
          date: '2026-02-25',
          start_time: '19:00:00',
          end_time: '20:00:00',
        },
        'user-123'
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('cutoff'),
      statusCode: 400,
    })
  })

  it('rejects bookings on blackout dates', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(
      makeSupabase({
        adminConfig: {
          venue_id: 'venue-123',
          min_advance_lead_time_hours: 0,
          same_day_cutoff_time: null,
          blackout_dates: ['2026-02-26'],
          holiday_dates: [],
          operating_hours: [],
        },
      })
    )

    await expect(
      bookingService.createBooking(
        {
          venue_id: 'venue-123',
          date: '2026-02-26',
          start_time: '12:00:00',
          end_time: '13:00:00',
        },
        'user-123'
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('blackout'),
      statusCode: 400,
    })
  })

  it('allows bookings regardless of configured operating hours windows', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(
      makeSupabase({
        adminConfig: {
          venue_id: 'venue-123',
          min_advance_lead_time_hours: 0,
          same_day_cutoff_time: null,
          blackout_dates: [],
          holiday_dates: [],
          // 2026-02-26 is Thursday (4)
          operating_hours: [{ day_of_week: 4, start_time: '09:00:00', end_time: '17:00:00' }],
        },
      })
    )

    const result = await bookingService.createBooking(
      {
        venue_id: 'venue-123',
        date: '2026-02-26',
        start_time: '18:00:00',
        end_time: '19:00:00',
      },
      'user-123'
    )

    expect(result.id).toBe('booking-123')
    expect(mockBookingRepo.create).toHaveBeenCalled()
  })

  it('allows booking when venue policy constraints are satisfied', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(
      makeSupabase({
        adminConfig: {
          venue_id: 'venue-123',
          min_advance_lead_time_hours: 1,
          same_day_cutoff_time: '20:00:00',
          blackout_dates: ['2026-03-01'],
          holiday_dates: ['2026-03-02'],
          operating_hours: [{ day_of_week: 4, start_time: '09:00:00', end_time: '20:00:00' }],
        },
      })
    )

    const result = await bookingService.createBooking(
      {
        venue_id: 'venue-123',
        date: '2026-02-26',
        start_time: '13:00:00',
        end_time: '14:00:00',
      },
      'user-123'
    )

    expect(result.id).toBe('booking-123')
    expect(mockBookingRepo.create).toHaveBeenCalled()
  })
})
