import type { OperatingHourWindow, Venue, VenueAdminConfig } from '@/types'
import { timeStringToDate } from '@/utils/dateHelpers'

export interface VenueConfigCompleteness {
  score: number
  missing_fields: string[]
  review_due: boolean
  next_review_at: string | null
}

export interface BookingPolicyViolation {
  code: 'min_lead_time' | 'same_day_cutoff' | 'blackout' | 'holiday' | 'operating_hours'
  message: string
}

export const DEFAULT_REVIEW_CADENCE_DAYS = 30

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateStringLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeStringLocal(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
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
    min_advance_lead_time_hours: 0,
    same_day_cutoff_time: null,
    operating_hours: [],
    blackout_dates: [],
    holiday_dates: [],
    insurance_requires_manual_approval: true,
    insurance_document_types: [],
    policy_cancel: null,
    policy_reschedule: null,
    policy_no_show: null,
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

  return {
    ...defaults,
    ...row,
    venue_id: venueId,
    drop_in_enabled: dropInEnabled,
    drop_in_price: Number.isFinite(dropInPrice) && dropInPrice > 0 ? dropInPrice : null,
    min_advance_lead_time_hours: Math.max(0, Number(row.min_advance_lead_time_hours || 0)),
    same_day_cutoff_time: row.same_day_cutoff_time ? normalizeTime(row.same_day_cutoff_time) : null,
    operating_hours: normalizeOperatingHours(row.operating_hours),
    blackout_dates: Array.isArray(row.blackout_dates) ? row.blackout_dates : [],
    holiday_dates: Array.isArray(row.holiday_dates) ? row.holiday_dates : [],
    insurance_requires_manual_approval:
      row.insurance_requires_manual_approval === undefined
        ? defaults.insurance_requires_manual_approval
        : Boolean(row.insurance_requires_manual_approval),
    insurance_document_types: Array.isArray(row.insurance_document_types)
      ? row.insurance_document_types.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [],
    policy_cancel: row.policy_cancel ?? null,
    policy_reschedule: row.policy_reschedule ?? null,
    policy_no_show: row.policy_no_show ?? null,
    review_cadence_days: Math.max(1, Number(row.review_cadence_days || defaults.review_cadence_days)),
    last_reviewed_at: row.last_reviewed_at ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

function fitsWithinOperatingHours(
  date: string,
  startTime: string,
  endTime: string,
  config: VenueAdminConfig
): boolean {
  if (config.operating_hours.length === 0) {
    return true
  }

  const dayOfWeek = parseLocalDate(date).getDay()
  const windows = config.operating_hours.filter((window) => window.day_of_week === dayOfWeek)
  if (windows.length === 0) {
    return false
  }

  return windows.some((window) => startTime >= window.start_time && endTime <= window.end_time)
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
  const bookingStart = timeStringToDate(args.date, normalizeTime(args.start_time))
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

  const bookingDate = args.date
  const today = toDateStringLocal(now)
  const sameDayCutoff = config.same_day_cutoff_time
  if (sameDayCutoff && bookingDate === today) {
    const currentTime = toTimeStringLocal(now)
    if (currentTime >= sameDayCutoff) {
      return {
        code: 'same_day_cutoff',
        message: `Same-day booking cutoff (${sameDayCutoff}) has passed`,
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

  if (!fitsWithinOperatingHours(bookingDate, normalizeTime(args.start_time), normalizeTime(args.end_time), config)) {
    return {
      code: 'operating_hours',
      message: 'Requested booking is outside configured operating hours',
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
  config: VenueAdminConfig,
  now: Date = new Date()
): VenueConfigCompleteness {
  const checks = [
    { key: 'hourly_rate', ok: Number(venue.hourly_rate) > 0 },
    { key: 'drop_in_price', ok: !config.drop_in_enabled || (config.drop_in_price !== null && config.drop_in_price > 0) },
    { key: 'operating_hours', ok: config.operating_hours.length > 0 },
    { key: 'lead_time', ok: config.min_advance_lead_time_hours >= 0 },
    { key: 'same_day_cutoff', ok: config.same_day_cutoff_time !== null },
    { key: 'amenities', ok: Array.isArray(venue.amenities) && venue.amenities.length > 0 },
    { key: 'review_cadence_days', ok: config.review_cadence_days > 0 },
    {
      key: 'insurance_document_types',
      ok: !venue.insurance_required || config.insurance_document_types.length > 0,
    },
    { key: 'last_reviewed_at', ok: Boolean(config.last_reviewed_at) },
  ]

  const passed = checks.filter((check) => check.ok).length
  const score = Math.round((passed / checks.length) * 100)
  const missingFields = checks.filter((check) => !check.ok).map((check) => check.key)

  let reviewDue = true
  let nextReviewAt: string | null = null
  if (config.last_reviewed_at) {
    const reviewedAt = new Date(config.last_reviewed_at)
    if (!Number.isNaN(reviewedAt.getTime())) {
      const nextReview = new Date(reviewedAt)
      nextReview.setDate(nextReview.getDate() + Math.max(1, config.review_cadence_days))
      reviewDue = now >= nextReview
      nextReviewAt = nextReview.toISOString()
    }
  }

  return {
    score,
    missing_fields: missingFields,
    review_due: reviewDue,
    next_review_at: nextReviewAt,
  }
}
