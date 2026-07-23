import { addDaysToDateString } from '@/utils/dateHelpers'
import {
  DEFAULT_PARITY_HORIZON_DAYS,
  resolveParityComparisonDateTo,
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
