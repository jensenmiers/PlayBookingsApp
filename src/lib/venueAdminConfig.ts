import type { OperatingHourWindow, Venue, VenueAdminConfig } from '@/types'

export interface VenueConfigCompleteness {
  score: number
  missing_fields: string[]
}

export interface BookingPolicyViolation {
  code: 'min_advance_days' | 'min_lead_time' | 'blackout' | 'holiday'
  message: string
}

export const DEFAULT_REVIEW_CADENCE_DAYS = 30
export const PLATFORM_TIME_ZONE = 'America/Los_Angeles'

function getDatePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: 'year' | 'month' | 'day') => Number(parts.find((part) => part.type === type)?.value || '0')

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
  }
}

function toDateStringInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateString(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day }
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )

  return asUtc - date.getTime()
}

function zonedDateTimeToDate(dateValue: string, timeValue: string, timeZone: string): Date {
  const { year, month, day } = parseDateString(dateValue)
  const [hours, minutes, seconds] = normalizeTime(timeValue).split(':').map(Number)

  let utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds)
  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(utcMs))
    utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - offset
  }

  return new Date(utcMs)
}

function addDays(dateValue: string, days: number): string {
  const { year, month, day } = parseDateString(dateValue)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function normalizeTime(value: string): string {
  if (!value) return value
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

function normalizeOperatingHourWindow(window: OperatingHourWindow): OperatingHourWindow | null {
  const day = Number(window.day_of_week)
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return null
  }

  const start = normalizeTime(window.start_time)
  const end = normalizeTime(window.end_time)
  if (!/^\d{2}:\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}:\d{2}$/.test(end)) {
    return null
  }
  if (start >= end) {
    return null
  }

  return {
    day_of_week: day,
    start_time: start,
    end_time: end,
  }
}

function normalizeOperatingHours(hours: unknown): OperatingHourWindow[] {
  if (!Array.isArray(hours)) {
    return []
  }

  return hours
    .map((entry) => normalizeOperatingHourWindow(entry as OperatingHourWindow))
    .filter((entry): entry is OperatingHourWindow => entry !== null)
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week
      }
      return a.start_time.localeCompare(b.start_time)
    })
}

export function getDefaultVenueAdminConfig(venueId: string): VenueAdminConfig {
  return {
    venue_id: venueId,
    drop_in_enabled: false,
    drop_in_price: null,
    regular_schedule_mode: 'template',
    min_advance_booking_days: 0,
    min_advance_lead_time_hours: 0,
    operating_hours: [],
    blackout_dates: [],
    holiday_dates: [],
    policy_cancel: null,
    policy_refund: null,
    policy_reschedule: null,
    policy_no_show: null,
    policy_operating_hours_notes: null,
    review_cadence_days: DEFAULT_REVIEW_CADENCE_DAYS,
    last_reviewed_at: null,
    updated_by: null,
    created_at: null,
    updated_at: null,
  }
}

export function normalizeVenueAdminConfig(
  venueId: string,
  row: Partial<VenueAdminConfig> | null | undefined
): VenueAdminConfig {
  const defaults = getDefaultVenueAdminConfig(venueId)
  if (!row) {
    return defaults
  }

  const dropInEnabled = Boolean(row.drop_in_enabled)
  const dropInPrice =
    row.drop_in_price === null || row.drop_in_price === undefined
      ? null
      : Number(row.drop_in_price)
  const normalizedDropInPrice =
    dropInPrice !== null && Number.isFinite(dropInPrice) && dropInPrice > 0 ? dropInPrice : null
  const regularScheduleMode = 'template'

  return {
    ...defaults,
    ...row,
    venue_id: venueId,
    drop_in_enabled: dropInEnabled,
    drop_in_price: normalizedDropInPrice,
    regular_schedule_mode: regularScheduleMode,
    min_advance_booking_days: Math.max(0, Number(row.min_advance_booking_days || 0)),
    min_advance_lead_time_hours: Math.max(0, Number(row.min_advance_lead_time_hours || 0)),
    operating_hours: normalizeOperatingHours(row.operating_hours),
    blackout_dates: Array.isArray(row.blackout_dates) ? row.blackout_dates : [],
    holiday_dates: Array.isArray(row.holiday_dates) ? row.holiday_dates : [],
    policy_cancel: row.policy_cancel ?? null,
    policy_refund: row.policy_refund ?? null,
    policy_reschedule: row.policy_reschedule ?? null,
    policy_no_show: row.policy_no_show ?? null,
    policy_operating_hours_notes: row.policy_operating_hours_notes ?? null,
    review_cadence_days: Math.max(1, Number(row.review_cadence_days || defaults.review_cadence_days)),
    last_reviewed_at: row.last_reviewed_at ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

export function getBookingPolicyViolation(
  args: {
    date: string
    start_time: string
    end_time: string
  },
  config: VenueAdminConfig,
  now: Date = new Date()
): BookingPolicyViolation | null {
  const bookingDate = args.date
  const today = toDateStringInTimeZone(now, PLATFORM_TIME_ZONE)

  const minAdvanceDays = Math.max(0, config.min_advance_booking_days || 0)
  if (minAdvanceDays > 0) {
    const earliestAllowedDate = addDays(today, minAdvanceDays)
    if (bookingDate < earliestAllowedDate) {
      return {
        code: 'min_advance_days',
        message: `Booking does not meet minimum advance booking period of ${minAdvanceDays} day(s)`,
      }
    }
  }

  const bookingStart = zonedDateTimeToDate(args.date, args.start_time, PLATFORM_TIME_ZONE)
  const minLeadHours = Math.max(0, config.min_advance_lead_time_hours || 0)
  if (minLeadHours > 0) {
    const diffMs = bookingStart.getTime() - now.getTime()
    const requiredMs = minLeadHours * 60 * 60 * 1000
    if (diffMs < requiredMs) {
      return {
        code: 'min_lead_time',
        message: `Booking does not meet minimum lead time of ${minLeadHours} hour(s)`,
      }
    }
  }

  if (config.blackout_dates.includes(bookingDate)) {
    return {
      code: 'blackout',
      message: 'Venue is unavailable on this blackout date',
    }
  }

  if (config.holiday_dates.includes(bookingDate)) {
    return {
      code: 'holiday',
      message: 'Venue is unavailable on this holiday',
    }
  }

  return null
}

export function isSlotAllowedByVenueConfig(
  slot: { date: string; start_time: string; end_time: string },
  config: VenueAdminConfig,
  now: Date = new Date()
): boolean {
  return getBookingPolicyViolation(slot, config, now) === null
}

export function calculateVenueConfigCompleteness(
  venue: Venue,
  config: VenueAdminConfig
): VenueConfigCompleteness {
  const checks = [
    { key: 'hourly_rate', ok: Number(venue.hourly_rate) > 0 },
    { key: 'drop_in_price', ok: !config.drop_in_enabled || (config.drop_in_price !== null && config.drop_in_price > 0) },
    { key: 'min_advance_days', ok: config.min_advance_booking_days >= 0 },
    { key: 'lead_time', ok: config.min_advance_lead_time_hours >= 0 },
    { key: 'amenities', ok: Array.isArray(venue.amenities) && venue.amenities.length > 0 },
  ]

  const passed = checks.filter((check) => check.ok).length
  const score = Math.round((passed / checks.length) * 100)
  const missingFields = checks.filter((check) => !check.ok).map((check) => check.key)

  return {
    score,
    missing_fields: missingFields,
  }
}
