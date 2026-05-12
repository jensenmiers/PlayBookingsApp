import type { BookingMode, VenueAdminConfig } from '@/types'
import { addDaysToDateString } from '@/utils/dateHelpers'

export type VenuePlanningPolicy = Pick<
  VenueAdminConfig,
  'min_advance_booking_days' | 'min_advance_lead_time_hours'
>

export interface VenuePlanningFact {
  value: string
  detail: string
}

function nonNegativeInteger(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0
}

function formatDayCount(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

function formatHourCount(hours: number): string {
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export function getMinimumAdvanceDate(
  today: string,
  policy: Partial<VenuePlanningPolicy> | null | undefined
): string {
  const minAdvanceDays = nonNegativeInteger(policy?.min_advance_booking_days)
  return minAdvanceDays > 0 ? addDaysToDateString(today, minAdvanceDays) : today
}

export function buildVenuePlanningFact(args: {
  bookingMode: BookingMode
  policy?: Partial<VenuePlanningPolicy> | null
}): VenuePlanningFact {
  const verb = args.bookingMode === 'request_to_book' ? 'Request' : 'Book'
  const minAdvanceDays = nonNegativeInteger(args.policy?.min_advance_booking_days)
  const minLeadHours = nonNegativeInteger(args.policy?.min_advance_lead_time_hours)

  if (minAdvanceDays > 0) {
    return {
      value: `${verb} at least ${formatDayCount(minAdvanceDays)} ahead`,
      detail: minLeadHours > 0
        ? `Minimum lead time is ${formatHourCount(minLeadHours)}`
        : 'Minimum notice before the date',
    }
  }

  if (minLeadHours > 0) {
    return {
      value: `${verb} at least ${formatHourCount(minLeadHours)} ahead`,
      detail: 'Minimum notice before start time',
    }
  }

  return {
    value: args.bookingMode === 'request_to_book' ? 'Request future dates' : 'Book future dates',
    detail: args.bookingMode === 'request_to_book' ? 'Host reviews preferred times' : 'Availability updates by date',
  }
}
