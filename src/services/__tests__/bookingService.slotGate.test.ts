jest.mock('@/repositories/bookingRepository')
jest.mock('../auditService')
jest.mock('../paymentService')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))

import { BookingService } from '../bookingService'
import { createClient } from '@/lib/supabase/server'

type SupabaseQueryPayload = {
  data: unknown
  error: { message: string; code?: string } | null
}

function createSupabaseQuery(payload: SupabaseQueryPayload) {
  const builder: Record<string, (...args: unknown[]) => unknown> = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    in: () => builder,
    maybeSingle: async () => ({ data: payload.data, error: payload.error }),
    single: async () => ({ data: payload.data, error: payload.error }),
    then: (resolve: (value: SupabaseQueryPayload) => unknown) => Promise.resolve(resolve(payload)),
  }
  return builder
}

describe('BookingService.checkConflicts - slot instance gating', () => {
  let bookingService: InstanceType<typeof BookingService>
  let mockBookingRepo: jest.Mocked<{
    findConflictingBookings: jest.Mock
    findConflictingRecurring: jest.Mock
  }>

  beforeEach(() => {
    jest.clearAllMocks()
    bookingService = new BookingService()
    mockBookingRepo = (bookingService as unknown as {
      bookingRepo: {
        findConflictingBookings: jest.Mock
        findConflictingRecurring: jest.Mock
      }
    }).bookingRepo
    mockBookingRepo.findConflictingBookings = jest.fn().mockResolvedValue([])
    mockBookingRepo.findConflictingRecurring = jest.fn().mockResolvedValue([])
  })

  it('returns slot_unavailable when no exact active regular slot instance exists', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'venues') {
          return createSupabaseQuery({ data: { instant_booking: true }, error: null })
        }
        if (table === 'slot_instances') {
          return createSupabaseQuery({ data: [], error: null })
        }
        if (table === 'external_availability_blocks') {
          return createSupabaseQuery({ data: [], error: null })
        }
        throw new Error(`Unexpected table query: ${table}`)
      }),
    })

    const result = await bookingService.checkConflicts(
      'venue-1',
      '2026-03-01',
      '17:00:00',
      '18:00:00'
    )

    expect(result).toEqual(
      expect.objectContaining({
        hasConflict: true,
        conflictType: 'slot_unavailable',
      })
    )
  })

  it('passes when exact slot exists and there are no booking overlaps or external blocks', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'venues') {
          return createSupabaseQuery({ data: { instant_booking: false }, error: null })
        }
        if (table === 'slot_instances') {
          return createSupabaseQuery({
            data: [
              {
                id: 'slot-1',
                venue_id: 'venue-1',
                date: '2026-03-01',
                start_time: '17:00:00',
                end_time: '18:00:00',
                action_type: 'request_private',
                is_active: true,
              },
            ],
            error: null,
          })
        }
        if (table === 'external_availability_blocks') {
          return createSupabaseQuery({ data: [], error: null })
        }
        throw new Error(`Unexpected table query: ${table}`)
      }),
    })

    const result = await bookingService.checkConflicts(
      'venue-1',
      '2026-03-01',
      '17:00:00',
      '18:00:00'
    )

    expect(result).toEqual(
      expect.objectContaining({
        hasConflict: false,
      })
    )
  })

  it('returns slot_unavailable when an external block overlaps an otherwise valid slot', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'venues') {
          return createSupabaseQuery({ data: { instant_booking: true }, error: null })
        }
        if (table === 'slot_instances') {
          return createSupabaseQuery({
            data: [
              {
                id: 'slot-1',
                venue_id: 'venue-1',
                date: '2026-03-01',
                start_time: '17:00:00',
                end_time: '18:00:00',
                action_type: 'instant_book',
                is_active: true,
              },
            ],
            error: null,
          })
        }
        if (table === 'external_availability_blocks') {
          return createSupabaseQuery({
            data: [
              {
                id: 'block-1',
                venue_id: 'venue-1',
                source: 'google_calendar',
                source_event_id: 'evt-1',
                start_at: '2026-03-01T17:15:00.000-08:00',
                end_at: '2026-03-01T18:15:00.000-08:00',
                status: 'active',
              },
            ],
            error: null,
          })
        }
        throw new Error(`Unexpected table query: ${table}`)
      }),
    })

    const result = await bookingService.checkConflicts(
      'venue-1',
      '2026-03-01',
      '17:00:00',
      '18:00:00'
    )

    expect(result).toEqual(
      expect.objectContaining({
        hasConflict: true,
        conflictType: 'slot_unavailable',
      })
    )
  })
})
