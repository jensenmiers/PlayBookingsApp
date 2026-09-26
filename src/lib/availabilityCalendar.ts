import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'
import type { VenuePlanningPolicy } from '@/lib/venuePlanning'
import { PLATFORM_TIME_ZONE } from '@/lib/venueAdminConfig'
import { getDateStringInTimeZone, zonedDateTimeToDate } from '@/utils/dateHelpers'

export interface AvailabilityWindow extends ComputedAvailabilitySlot {
  slots: ComputedAvailabilitySlot[]
}

export const CALENDAR_START_MINUTES = 7 * 60
export const CALENDAR_END_MINUTES = 22 * 60

export function timeToMinutes(time: string): number {
  const [hours, minutes, seconds = 0] = time.split(':').map(Number)
  return hours * 60 + minutes + seconds / 60
}

export function getRequiredNoticeHours(policy?: Partial<VenuePlanningPolicy> | null): number {
  return Math.max(0, policy?.min_advance_booking_days || 0) * 24
    + Math.max(0, policy?.min_advance_lead_time_hours || 0)
}

export function getNoticeCutoff(policy: Partial<VenuePlanningPolicy> | null | undefined, now: Date): Date {
  return new Date(now.getTime() + getRequiredNoticeHours(policy) * 3_600_000)
}

export function getNoticeMinutesForDate(date: string, cutoff: Date): number {
  const cutoffDate = getDateStringInTimeZone(cutoff, PLATFORM_TIME_ZONE)
  if (date < cutoffDate) return 1440
  if (date > cutoffDate) return 0
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PLATFORM_TIME_ZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(cutoff)
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value || 0)
  return value('hour') * 60 + value('minute') + value('second') / 60
}

export function isCalendarSlotEligible(slot: ComputedAvailabilitySlot, policy: Partial<VenuePlanningPolicy> | null | undefined, now: Date): boolean {
  const cutoff = slot.action_type === 'info_only_open_gym' ? now : getNoticeCutoff(policy, now)
  return zonedDateTimeToDate(slot.date, slot.start_time, PLATFORM_TIME_ZONE).getTime() >= cutoff.getTime()
}

/** Merge presentation only: the original slots remain the authoritative booking choices. */
export function buildAvailabilityWindows(slots: ComputedAvailabilitySlot[], policy: Partial<VenuePlanningPolicy> | null | undefined, now: Date): AvailabilityWindow[] {
  const groups = new Map<string, ComputedAvailabilitySlot[]>()
  for (const slot of slots) {
    if (!isCalendarSlotEligible(slot, policy, now)) continue
    const key = JSON.stringify([slot.venue_id, slot.date, slot.action_type,
      slot.action_type === 'info_only_open_gym' ? null : slot.modal_content || null,
    ])
    const group = groups.get(key) || []
    group.push(slot)
    groups.set(key, group)
  }
  const windows: AvailabilityWindow[] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time))
    let current: AvailabilityWindow | undefined
    for (const slot of group) {
      if (current && slot.start_time <= current.end_time) {
        current.end_time = current.end_time > slot.end_time ? current.end_time : slot.end_time
        current.slots.push(slot)
      } else {
        current = { ...slot, slots: [slot] }
        windows.push(current)
      }
    }
  }
  return windows.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
}

/** Every connected overlap group shares a lane width, including chained overlaps. */
export function layoutAvailabilityWindows(windows: AvailabilityWindow[]) {
  const result: { window: AvailabilityWindow; lane: number; laneCount: number }[] = []
  let group: typeof result = []
  let laneEnds: string[] = []
  let groupEnd = ''
  const finishGroup = () => {
    for (const item of group) item.laneCount = laneEnds.length
    result.push(...group)
    group = []
    laneEnds = []
  }
  for (const window of [...windows].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    if (window.start_time >= groupEnd) finishGroup()
    let lane = laneEnds.findIndex(end => end <= window.start_time)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = window.end_time
    group.push({ window, lane, laneCount: 1 })
    groupEnd = group.length === 1 ? window.end_time : groupEnd > window.end_time ? groupEnd : window.end_time
  }
  finishGroup()
  return result
}
