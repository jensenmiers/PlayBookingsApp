import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'

describe('formatCompactNextAvailable', () => {
  it('formats next available slots with weekday and time', () => {
    expect(formatCompactNextAvailable('2026-02-20', '18:00:00')).toBe('Fri 6:00 PM')
  })

  it('handles minute precision without seconds', () => {
    expect(formatCompactNextAvailable('2026-02-21', '09:30')).toBe('Sat 9:30 AM')
  })
})
