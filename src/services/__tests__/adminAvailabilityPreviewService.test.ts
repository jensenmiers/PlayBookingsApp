import type { AdminVenueAvailabilityPreviewRequest } from '@/types/api'
import {
  buildDraftAvailabilityPreviewDays,
  countChangedPreviewDays,
} from '../adminAvailabilityPreviewService'

const baseRequest: AdminVenueAvailabilityPreviewRequest = {
  operating_hours: [
    { day_of_week: 2, start_time: '09:00:00', end_time: '12:00:00' },
  ],
  drop_in_enabled: false,
  drop_in_price: null,
  drop_in_templates: [],
  instant_booking: true,
  min_advance_booking_days: 0,
  min_advance_lead_time_hours: 0,
  blackout_dates: [],
  holiday_dates: [],
}

describe('adminAvailabilityPreviewService', () => {
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
})
