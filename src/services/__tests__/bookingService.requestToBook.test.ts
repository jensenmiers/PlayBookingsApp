import type { Venue } from '@/types'

jest.mock('@/repositories/bookingRepository')
jest.mock('../auditService')
jest.mock('../paymentService')
jest.mock('../bookingRequestEmailService')
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
import { BookingRequestEmailService } from '../bookingRequestEmailService'

const requestVenue: Venue = {
  id: 'venue-123',
  name: 'First Presbyterian Church of Hollywood',
  description: 'Gym',
  address: '1760 N Gower St',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90028',
  owner_id: 'owner-123',
  hourly_rate: 60,
  instant_booking: false,
  booking_mode: 'request_to_book',
  insurance_required: false,
  max_advance_booking_days: 180,
  photos: [],
  amenities: [],
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const requestData = {
  venue_id: 'venue-123',
  date: '2026-02-28',
  start_time: '08:00:00',
  end_time: '10:00:00',
  activity: 'Pickup run',
}

function makeSupabase({
  venue = requestVenue,
  savedPhone = null as string | null,
}: { venue?: Venue; savedPhone?: string | null } = {}) {
  const usersUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const usersUpdate = jest.fn().mockReturnValue({ eq: usersUpdateEq })
  const client = {
    from: jest.fn().mockImplementation((table: string) => {
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
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { phone: savedPhone }, error: null }),
          update: usersUpdate,
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }
  return { client, usersUpdate, usersUpdateEq }
}

describe('BookingService.createBooking - request-to-book requests', () => {
  let bookingService: BookingService
  let mockBookingRepo: jest.Mocked<BookingRepository>
  let mockRequestEmails: jest.Mocked<BookingRequestEmailService>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 25, 10, 0, 0))

    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as { bookingRepo: jest.Mocked<BookingRepository> }).bookingRepo
    mockBookingRepo.create = jest.fn().mockImplementation(async (data) => ({
      id: 'booking-123',
      ...data,
      created_at: '2026-02-25T10:00:00Z',
      updated_at: '2026-02-25T10:00:00Z',
    }))
    mockRequestEmails = (bookingService as unknown as {
      bookingRequestEmailService: jest.Mocked<BookingRequestEmailService>
    }).bookingRequestEmailService
    mockRequestEmails.sendRequestReceived = jest.fn().mockResolvedValue(undefined)

    const auditService = (bookingService as unknown as { auditService: { logCreate: jest.Mock } }).auditService
    auditService.logCreate = jest.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('requires an activity for request-to-book venues', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabase({ savedPhone: '555-0100' }).client)

    await expect(
      bookingService.createBooking({ ...requestData, activity: '  ' }, 'user-123')
    ).rejects.toMatchObject({
      message: expect.stringContaining('what you are planning'),
      statusCode: 400,
    })
    expect(mockBookingRepo.create).not.toHaveBeenCalled()
  })

  it('requires a phone number when none is saved or given', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabase({ savedPhone: null }).client)

    await expect(
      bookingService.createBooking(requestData, 'user-123')
    ).rejects.toMatchObject({
      message: expect.stringContaining('phone number'),
      statusCode: 400,
    })
    expect(mockBookingRepo.create).not.toHaveBeenCalled()
  })

  it('saves a given phone number to the profile and stores the activity on the booking', async () => {
    const { client, usersUpdate, usersUpdateEq } = makeSupabase({ savedPhone: null })
    ;(createClient as jest.Mock).mockResolvedValue(client)

    const result = await bookingService.createBooking(
      { ...requestData, phone: ' (323) 555-0100 ' },
      'user-123'
    )

    expect(usersUpdate).toHaveBeenCalledWith(expect.objectContaining({ phone: '(323) 555-0100' }))
    expect(usersUpdateEq).toHaveBeenCalledWith('id', 'user-123')
    expect(mockBookingRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ activity: 'Pickup run', status: 'pending', total_amount: 120 })
    )
    expect(result.requiresPayment).toBe(false)
  })

  it('uses the saved phone number when none is given', async () => {
    const { client, usersUpdate } = makeSupabase({ savedPhone: '555-0100' })
    ;(createClient as jest.Mock).mockResolvedValue(client)

    await bookingService.createBooking(requestData, 'user-123')

    expect(usersUpdate).not.toHaveBeenCalled()
    expect(mockBookingRepo.create).toHaveBeenCalled()
  })

  it('emails the request out after saving it', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabase({ savedPhone: '555-0100' }).client)

    await bookingService.createBooking(requestData, 'user-123')

    expect(mockRequestEmails.sendRequestReceived).toHaveBeenCalledWith('booking-123')
  })

  it('still saves the request when the emails fail', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeSupabase({ savedPhone: '555-0100' }).client)
    mockRequestEmails.sendRequestReceived = jest.fn().mockRejectedValue(new Error('Resend down'))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await bookingService.createBooking(requestData, 'user-123')

    expect(result.id).toBe('booking-123')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
