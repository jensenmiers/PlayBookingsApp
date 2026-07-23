import { addDaysToDateString } from '@/utils/dateHelpers'

/** Default horizon used when the RPC does not report a farther next slot. */
export const DEFAULT_PARITY_HORIZON_DAYS = 365

/**
 * Resolve the end date for AvailabilityService comparison.
 * The next-available RPC is unbounded; when it returns a next slot beyond the
 * default horizon, extend the comparison window so we do not false-positive as
 * `rpc_has_next_but_combined_empty`.
 */
export function resolveParityComparisonDateTo(
  today: string,
  nextSlotDate: string | null | undefined,
  horizonDays: number = DEFAULT_PARITY_HORIZON_DAYS
): string {
  const defaultDateTo = addDaysToDateString(today, horizonDays)
  if (nextSlotDate && nextSlotDate > defaultDateTo) {
    return nextSlotDate
  }
  return defaultDateTo
}
