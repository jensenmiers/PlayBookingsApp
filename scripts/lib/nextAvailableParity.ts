import { addDaysToDateString } from '@/utils/dateHelpers'
import type { SlotActionType } from '@/types'

/** Default horizon used when the RPC does not report a farther next slot. */
export const DEFAULT_PARITY_HORIZON_DAYS = 365

export type ParitySortableSlot = {
  date: string
  start_time: string
  action_type: SlotActionType
  slot_instance_id?: string | null
}

function isRentalActionType(actionType: SlotActionType): boolean {
  return actionType === 'instant_book' || actionType === 'request_private'
}

/**
 * Match get_venues_with_next_available next_slots ordering:
 * slot_date, start_time, rental before open gym, then slot_id.
 */
export function compareNextAvailableParitySlots(
  left: ParitySortableSlot,
  right: ParitySortableSlot
): number {
  const timeComparison = `${left.date}-${left.start_time}`.localeCompare(
    `${right.date}-${right.start_time}`
  )
  if (timeComparison !== 0) return timeComparison

  const leftIsRental = isRentalActionType(left.action_type)
  const rightIsRental = isRentalActionType(right.action_type)
  if (leftIsRental !== rightIsRental) {
    return leftIsRental ? -1 : 1
  }

  return (left.slot_instance_id || '').localeCompare(right.slot_instance_id || '')
}

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
