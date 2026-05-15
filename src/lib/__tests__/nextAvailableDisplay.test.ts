import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'

describe('formatCompactNextAvailable', () => {
  it('formats top-of-hour slots with weekday, month, day, and compact time', () => {
    expect(formatCompactNextAvailable('2026-02-20', '18:00:00')).toBe('Fri Feb 20, 6 PM')
  })

  it('handles minute precision without seconds', () => {
    expect(formatCompactNextAvailable('2026-02-21', '09:30')).toBe('Sat Feb 21, 9:30 AM')
  })
})
