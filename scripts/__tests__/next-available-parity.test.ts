import { addDaysToDateString } from '@/utils/dateHelpers'
import {
  compareNextAvailableParitySlots,
  DEFAULT_PARITY_HORIZON_DAYS,
  resolveParityComparisonDateTo,
  type ParitySortableSlot,
} from '../lib/nextAvailableParity'

describe('resolveParityComparisonDateTo', () => {
  const today = '2026-07-23'
  const defaultDateTo = addDaysToDateString(today, DEFAULT_PARITY_HORIZON_DAYS)

  it('uses the default horizon when RPC has no next slot date', () => {
    expect(resolveParityComparisonDateTo(today, null)).toBe(defaultDateTo)
    expect(resolveParityComparisonDateTo(today, undefined)).toBe(defaultDateTo)
  })

  it('keeps the default horizon when next slot is inside the window', () => {
    expect(resolveParityComparisonDateTo(today, '2026-12-01')).toBe(defaultDateTo)
    expect(resolveParityComparisonDateTo(today, defaultDateTo)).toBe(defaultDateTo)
  })

  it('extends the window when RPC next slot is beyond the default horizon', () => {
    const beyondHorizon = addDaysToDateString(today, DEFAULT_PARITY_HORIZON_DAYS + 30)
    expect(resolveParityComparisonDateTo(today, beyondHorizon)).toBe(beyondHorizon)
  })
})

describe('compareNextAvailableParitySlots', () => {
  const base: Omit<ParitySortableSlot, 'slot_instance_id' | 'action_type'> = {
    date: '2026-07-23',
    start_time: '18:00:00',
  }

  it('breaks same-time rental ties by slot_id regardless of compare order', () => {
    const instant: ParitySortableSlot = {
      ...base,
      action_type: 'instant_book',
      slot_instance_id: 'slot-b',
    }
    const request: ParitySortableSlot = {
      ...base,
      action_type: 'request_private',
      slot_instance_id: 'slot-a',
    }

    expect(compareNextAvailableParitySlots(instant, request)).toBeGreaterThan(0)
    expect(compareNextAvailableParitySlots(request, instant)).toBeLessThan(0)
    expect([instant, request].sort(compareNextAvailableParitySlots).map((s) => s.slot_instance_id))
      .toEqual(['slot-a', 'slot-b'])
    expect([request, instant].sort(compareNextAvailableParitySlots).map((s) => s.slot_instance_id))
      .toEqual(['slot-a', 'slot-b'])
  })

  it('prefers rental over open gym at the same timestamp, then slot_id', () => {
    const openGym: ParitySortableSlot = {
      ...base,
      action_type: 'info_only_open_gym',
      slot_instance_id: 'slot-a',
    }
    const rental: ParitySortableSlot = {
      ...base,
      action_type: 'instant_book',
      slot_instance_id: 'slot-z',
    }

    expect(compareNextAvailableParitySlots(openGym, rental)).toBeGreaterThan(0)
    expect(compareNextAvailableParitySlots(rental, openGym)).toBeLessThan(0)
  })
})
