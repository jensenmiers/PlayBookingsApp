import {
  buildCalendarBlockMutations,
  normalizeGoogleEventToBlock,
  type GoogleCalendarEventInput,
} from '@/lib/googleCalendarSync'

describe('normalizeGoogleEventToBlock', () => {
  it('normalizes timed events', () => {
    const block = normalizeGoogleEventToBlock(
      {
        id: 'evt-1',
        status: 'confirmed',
        updated: '2026-03-03T10:00:00Z',
        start: { dateTime: '2026-03-04T09:00:00-08:00' },
        end: { dateTime: '2026-03-04T10:00:00-08:00' },
      },
      'America/Los_Angeles'
    )

    expect(block).toEqual(
      expect.objectContaining({
        source_event_id: 'evt-1',
        start_at: '2026-03-04T17:00:00.000Z',
        end_at: '2026-03-04T18:00:00.000Z',
      })
    )
  })

  it('normalizes all-day events as full-day blocks in PT', () => {
    const block = normalizeGoogleEventToBlock(
      {
        id: 'evt-2',
        status: 'confirmed',
        updated: '2026-03-03T10:00:00Z',
        start: { date: '2026-03-04' },
        end: { date: '2026-03-05' },
      },
      'America/Los_Angeles'
    )

    expect(block).toEqual(
      expect.objectContaining({
        source_event_id: 'evt-2',
        start_at: '2026-03-04T08:00:00.000Z',
        end_at: '2026-03-05T08:00:00.000Z',
        metadata: expect.objectContaining({
          all_day: true,
        }),
      })
    )
  })

  it('returns null for cancelled events', () => {
    const block = normalizeGoogleEventToBlock({
      id: 'evt-3',
      status: 'cancelled',
      start: { dateTime: '2026-03-04T09:00:00-08:00' },
      end: { dateTime: '2026-03-04T10:00:00-08:00' },
    })

    expect(block).toBeNull()
  })
})

describe('buildCalendarBlockMutations', () => {
  it('builds upserts and cancellations idempotently by event id', () => {
    const events: GoogleCalendarEventInput[] = [
      {
        id: 'evt-upsert',
        status: 'confirmed',
        updated: '2026-03-03T10:00:00Z',
        start: { dateTime: '2026-03-04T09:00:00-08:00' },
        end: { dateTime: '2026-03-04T10:00:00-08:00' },
      },
      {
        id: 'evt-upsert',
        status: 'confirmed',
        updated: '2026-03-03T10:00:00Z',
        start: { dateTime: '2026-03-04T09:00:00-08:00' },
        end: { dateTime: '2026-03-04T10:00:00-08:00' },
      },
      {
        id: 'evt-cancel',
        status: 'cancelled',
        updated: '2026-03-03T10:00:00Z',
        start: { dateTime: '2026-03-04T11:00:00-08:00' },
        end: { dateTime: '2026-03-04T12:00:00-08:00' },
      },
    ]

    const result = buildCalendarBlockMutations(events, {
      venueId: 'venue-1',
      source: 'google_calendar',
      calendarId: 'calendar-1',
      timeZone: 'America/Los_Angeles',
    })

    expect(result.upserts).toHaveLength(1)
    expect(result.cancelledSourceEventIds).toEqual(['evt-cancel'])
  })
})
