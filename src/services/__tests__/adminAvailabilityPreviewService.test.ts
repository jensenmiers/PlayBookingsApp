const mockCreateAdminClient = jest.fn()
const mockGetAvailableSlots = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

jest.mock('@/services/availabilityService', () => ({
  AvailabilityService: jest.fn().mockImplementation(() => ({
    getAvailableSlots: (...args: unknown[]) => mockGetAvailableSlots(...args),
  })),
}))

import type { AdminVenueAvailabilityPreviewRequest } from '@/types/api'
import {
  AdminAvailabilityPreviewService,
  buildDraftAvailabilityPreviewDays,
  countChangedPreviewDays,
} from '../adminAvailabilityPreviewService'

const baseRequest: AdminVenueAvailabilityPreviewRequest = {
  operating_hours: [
    { day_of_week: 2, start_time: '09:00:00', end_time: '12:00:00' },
  ],
  drop_in_enabled: false,
  drop_in_templates: [],
  min_advance_booking_days: 0,
  min_advance_lead_time_hours: 0,
  blackout_dates: [],
  holiday_dates: [],
}

const dropInRequest: AdminVenueAvailabilityPreviewRequest = {
  ...baseRequest,
  drop_in_enabled: true,
  drop_in_templates: [
    { day_of_week: 2, start_time: '18:00:00', end_time: '20:00:00' },
  ],
}

function createResolvedQuery<T>(data: T, error: { message: string; code?: string } | null = null) {
  const chain = {
    data,
    error,
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    in: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve({ data, error })),
  }

  return chain
}

function mockPreviewServiceQueries(args?: {
  venue?: Record<string, unknown> | null
  configRow?: Record<string, unknown> | null
  templateRows?: unknown[]
  bookingRows?: unknown[]
  recurringRows?: unknown[]
  externalBlocks?: unknown[]
}) {
  const tables = {
    venues: createResolvedQuery(args?.venue ?? { id: 'venue-1' }),
    venue_admin_configs: createResolvedQuery(args?.configRow ?? null),
    slot_templates: createResolvedQuery(args?.templateRows ?? []),
    bookings: createResolvedQuery(args?.bookingRows ?? []),
    recurring_bookings: createResolvedQuery(args?.recurringRows ?? []),
    external_availability_blocks: createResolvedQuery(args?.externalBlocks ?? []),
  }

  mockCreateAdminClient.mockReturnValue({
    from: jest.fn((table: keyof typeof tables) => {
      const query = tables[table]
      if (!query) {
        throw new Error(`Unexpected table queried in test: ${table}`)
      }
      return query
    }),
  })
}

describe('adminAvailabilityPreviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAvailableSlots.mockResolvedValue([])
  })

  it('builds private-booking preview windows from operating hours', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10'],
      request: baseRequest,
      now: new Date('2026-03-09T08:00:00-08:00'),
      bookings: [],
      recurringBookings: [],
      externalBlocks: [],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [{ start_time: '09:00:00', end_time: '12:00:00' }],
        drop_in: [],
        reason_chips: [],
      },
    ])
  })

  it('filters draft slots for blackout and advance-notice rules', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10', '2026-03-11'],
      request: {
        ...baseRequest,
        blackout_dates: ['2026-03-11'],
        min_advance_lead_time_hours: 12,
      },
      now: new Date('2026-03-10T08:30:00-08:00'),
      bookings: [],
      recurringBookings: [],
      externalBlocks: [],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [],
        drop_in: [],
        reason_chips: ['advance_notice'],
      },
      {
        date: '2026-03-11',
        private_booking: [],
        drop_in: [],
        reason_chips: ['blackout', 'closed'],
      },
    ])
  })

  it('filters draft slots before exact elapsed minimum advance days', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-05-15'],
      request: {
        ...baseRequest,
        operating_hours: [
          { day_of_week: 5, start_time: '18:00:00', end_time: '19:00:00' },
          { day_of_week: 5, start_time: '21:13:00', end_time: '22:13:00' },
        ],
        min_advance_booking_days: 2,
      },
      now: new Date('2026-05-14T04:13:00.000Z'),
      bookings: [],
      recurringBookings: [],
      externalBlocks: [],
    })

    expect(days).toEqual([
      {
        date: '2026-05-15',
        private_booking: [{ start_time: '21:13:00', end_time: '22:13:00' }],
        drop_in: [],
        reason_chips: ['advance_notice'],
      },
    ])
  })

  it('adds concise reason chips for Google blocks and fully booked days', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10'],
      request: baseRequest,
      now: new Date('2026-03-09T08:00:00-08:00'),
      bookings: [
        {
          venue_id: 'venue-1',
          date: '2026-03-10',
          start_time: '10:00:00',
          end_time: '12:00:00',
          status: 'confirmed',
        },
      ],
      recurringBookings: [],
      externalBlocks: [
        {
          start_at: '2026-03-10T09:00:00-07:00',
          end_at: '2026-03-10T10:00:00-07:00',
          source: 'google_calendar',
          status: 'active',
        },
      ],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [],
        drop_in: [],
        reason_chips: ['google_blocked', 'fully_booked'],
      },
    ])
  })

  it('does not mark a partially booked day as fully booked when private availability remains', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10'],
      request: baseRequest,
      now: new Date('2026-03-09T08:00:00-08:00'),
      bookings: [
        {
          venue_id: 'venue-1',
          date: '2026-03-10',
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: 'confirmed',
        },
      ],
      recurringBookings: [],
      externalBlocks: [],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [
          { start_time: '09:00:00', end_time: '10:00:00' },
          { start_time: '11:00:00', end_time: '12:00:00' },
        ],
        drop_in: [],
        reason_chips: [],
      },
    ])
  })

  it('splits draft drop-in windows around partial Google blocks', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10'],
      request: dropInRequest,
      now: new Date('2026-03-09T08:00:00-08:00'),
      bookings: [],
      recurringBookings: [],
      externalBlocks: [
        {
          start_at: '2026-03-10T18:30:00-07:00',
          end_at: '2026-03-10T19:00:00-07:00',
          source: 'google_calendar',
          status: 'active',
        },
      ],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [{ start_time: '09:00:00', end_time: '12:00:00' }],
        drop_in: [
          { start_time: '18:00:00', end_time: '18:30:00' },
          { start_time: '19:00:00', end_time: '20:00:00' },
        ],
        reason_chips: ['google_blocked'],
      },
    ])
  })

  it('removes draft drop-in windows when Google blocks cover the full interval', () => {
    const days = buildDraftAvailabilityPreviewDays({
      dateRange: ['2026-03-10'],
      request: dropInRequest,
      now: new Date('2026-03-09T08:00:00-08:00'),
      bookings: [],
      recurringBookings: [],
      externalBlocks: [
        {
          start_at: '2026-03-10T18:00:00-07:00',
          end_at: '2026-03-10T20:00:00-07:00',
          source: 'google_calendar',
          status: 'active',
        },
      ],
    })

    expect(days).toEqual([
      {
        date: '2026-03-10',
        private_booking: [{ start_time: '09:00:00', end_time: '12:00:00' }],
        drop_in: [],
        reason_chips: ['google_blocked'],
      },
    ])
  })

  it('counts changed days between live and draft previews', () => {
    expect(
      countChangedPreviewDays(
        [
          {
            date: '2026-03-10',
            private_booking: [{ start_time: '09:00:00', end_time: '12:00:00' }],
            drop_in: [],
            reason_chips: [],
          },
        ],
        [
          {
            date: '2026-03-10',
            private_booking: [],
            drop_in: [],
            reason_chips: ['fully_booked'],
          },
        ]
      )
    ).toBe(1)
  })

  it('ignores saved non-rendered fields when computing preview draft state', async () => {
    mockGetAvailableSlots.mockResolvedValue([
      {
        date: '2026-03-10',
        start_time: '09:00:00',
        end_time: '12:00:00',
        venue_id: 'venue-1',
        action_type: 'instant_book',
      },
    ])
    mockPreviewServiceQueries({
      venue: { id: 'venue-1', instant_booking: false },
      configRow: {
        venue_id: 'venue-1',
        drop_in_enabled: false,
        drop_in_price: 25,
        min_advance_booking_days: 0,
        min_advance_lead_time_hours: 0,
        operating_hours: baseRequest.operating_hours,
        blackout_dates: [],
        holiday_dates: [],
      },
    })

    const service = new AdminAvailabilityPreviewService()
    const result = await service.getVenueAvailabilityPreview({
      venueId: 'venue-1',
      request: baseRequest,
      now: new Date('2026-03-10T08:00:00-08:00'),
    })

    expect(result.changed_day_count).toBe(0)
    expect(result.has_unpublished_changes).toBe(false)
  })

  it('does not enter draft mode when preview-affecting fields change outside the next 7 days', async () => {
    mockPreviewServiceQueries({
      venue: { id: 'venue-1' },
      configRow: {
        venue_id: 'venue-1',
        drop_in_enabled: false,
        drop_in_price: null,
        min_advance_booking_days: 0,
        min_advance_lead_time_hours: 0,
        operating_hours: [],
        blackout_dates: [],
        holiday_dates: [],
      },
    })

    const service = new AdminAvailabilityPreviewService()
    const result = await service.getVenueAvailabilityPreview({
      venueId: 'venue-1',
      request: {
        ...baseRequest,
        operating_hours: [],
        blackout_dates: ['2026-04-01'],
      },
      now: new Date('2026-03-10T08:00:00-08:00'),
    })

    expect(result.changed_day_count).toBe(0)
    expect(result.has_unpublished_changes).toBe(false)
  })

  it('enters draft mode when the rendered next-7-days preview changes', async () => {
    mockPreviewServiceQueries({
      venue: { id: 'venue-1' },
      configRow: {
        venue_id: 'venue-1',
        drop_in_enabled: false,
        drop_in_price: null,
        min_advance_booking_days: 0,
        min_advance_lead_time_hours: 0,
        operating_hours: [],
        blackout_dates: [],
        holiday_dates: [],
      },
    })

    const service = new AdminAvailabilityPreviewService()
    const result = await service.getVenueAvailabilityPreview({
      venueId: 'venue-1',
      request: {
        ...baseRequest,
        operating_hours: [],
        blackout_dates: ['2026-03-10'],
      },
      now: new Date('2026-03-10T08:00:00-08:00'),
    })

    expect(result.changed_day_count).toBe(1)
    expect(result.has_unpublished_changes).toBe(true)
  })
})
