const DEFAULT_TIME_ZONE = 'America/Los_Angeles'

type GoogleEventDateTime = {
  dateTime?: string
  date?: string
  timeZone?: string
}

export type GoogleCalendarEventInput = {
  id?: string
  status?: string
  updated?: string
  summary?: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
}

export type CalendarBlockUpsert = {
  venue_id: string
  source: string
  source_event_id: string
  start_at: string
  end_at: string
  status: 'active'
  metadata: Record<string, unknown>
}

export type CalendarBlockMutationResult = {
  upserts: CalendarBlockUpsert[]
  cancelledSourceEventIds: string[]
}

function normalizeDatePart(value: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }
  const [year, month, day] = value.split('-').map(Number)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  return { year, month, day }
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const rawOffset = parts.find((part) => part.type === 'timeZoneName')?.value || ''
  const match = rawOffset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!match) {
    return 0
  }

  const sign = match[1] === '+' ? 1 : -1
  const hours = Number(match[2] || '0')
  const minutes = Number(match[3] || '0')
  return sign * (hours * 60 + minutes)
}

function zonedDateTimeToIso(dateValue: string, timeValue: string, timeZone: string): string | null {
  const dateParts = normalizeDatePart(dateValue)
  if (!dateParts) {
    return null
  }

  if (!/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
    return null
  }

  const [hours, minutes, seconds] = timeValue.split(':').map(Number)
  let utcMs = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, seconds)

  for (let index = 0; index < 2; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(utcMs))
    utcMs =
      Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, seconds)
      - offsetMinutes * 60 * 1000
  }

  return new Date(utcMs).toISOString()
}

function normalizeDateTimeValue(
  value: GoogleEventDateTime | undefined,
  timeZoneFallback: string
): { iso: string; allDay: boolean } | null {
  if (!value) {
    return null
  }

  if (value.dateTime) {
    const date = new Date(value.dateTime)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return {
      iso: date.toISOString(),
      allDay: false,
    }
  }

  if (value.date) {
    const iso = zonedDateTimeToIso(value.date, '00:00:00', value.timeZone || timeZoneFallback)
    if (!iso) {
      return null
    }
    return {
      iso,
      allDay: true,
    }
  }

  return null
}

export function normalizeGoogleEventToBlock(
  event: GoogleCalendarEventInput,
  timeZoneFallback: string = DEFAULT_TIME_ZONE
): Omit<CalendarBlockUpsert, 'venue_id' | 'source'> | null {
  const sourceEventId = event.id?.trim()
  if (!sourceEventId) {
    return null
  }

  if (event.status === 'cancelled') {
    return null
  }

  const start = normalizeDateTimeValue(event.start, timeZoneFallback)
  const end = normalizeDateTimeValue(event.end, timeZoneFallback)
  if (!start || !end) {
    return null
  }

  if (start.iso >= end.iso) {
    return null
  }

  return {
    source_event_id: sourceEventId,
    start_at: start.iso,
    end_at: end.iso,
    status: 'active',
    metadata: {
      all_day: start.allDay || end.allDay,
      updated: event.updated || null,
      summary: event.summary || null,
    },
  }
}

export function buildCalendarBlockMutations(
  events: GoogleCalendarEventInput[],
  args: {
    venueId: string
    source: string
    calendarId: string
    timeZone?: string
  }
): CalendarBlockMutationResult {
  const cancelledSourceEventIds = new Set<string>()
  const upsertsByEventId = new Map<string, CalendarBlockUpsert>()
  const timeZone = args.timeZone || DEFAULT_TIME_ZONE

  for (const event of events) {
    const sourceEventId = event.id?.trim()
    if (!sourceEventId) {
      continue
    }

    if (event.status === 'cancelled') {
      cancelledSourceEventIds.add(sourceEventId)
      upsertsByEventId.delete(sourceEventId)
      continue
    }

    const normalized = normalizeGoogleEventToBlock(event, timeZone)
    if (!normalized) {
      continue
    }

    upsertsByEventId.set(sourceEventId, {
      venue_id: args.venueId,
      source: args.source,
      source_event_id: sourceEventId,
      start_at: normalized.start_at,
      end_at: normalized.end_at,
      status: 'active',
      metadata: {
        ...normalized.metadata,
        calendar_id: args.calendarId,
      },
    })
  }

  return {
    upserts: Array.from(upsertsByEventId.values()),
    cancelledSourceEventIds: Array.from(cancelledSourceEventIds).sort((a, b) => a.localeCompare(b)),
  }
}
