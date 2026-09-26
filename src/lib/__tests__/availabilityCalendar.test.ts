import { buildAvailabilityWindows, getNoticeCutoff, getNoticeMinutesForDate, layoutAvailabilityWindows } from '../availabilityCalendar'
import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'

const slot = (start: string, end: string, overrides: Partial<ComputedAvailabilitySlot> = {}): ComputedAvailabilitySlot => ({
  venue_id: 'venue-1', date: '2026-09-06', start_time: start, end_time: end,
  action_type: 'request_private', ...overrides,
})

describe('availability calendar windows', () => {
  const now = new Date('2026-09-04T22:00:00Z')
  it('merges adjacent and overlapping rentals but preserves gaps and original booking choices', () => {
    const slots = [slot('18:00:00', '19:00:00'), slot('17:00:00', '18:00:00'), slot('17:00:00', '19:00:00'), slot('20:00:00', '21:00:00')]
    const windows = buildAvailabilityWindows(slots, null, now)
    expect(windows.map(w => [w.start_time, w.end_time])).toEqual([['17:00:00', '19:00:00'], ['20:00:00', '21:00:00']])
    expect(windows[0].slots).toHaveLength(3)
  })
  it('merges open gym hours while keeping booking types separate', () => {
    const windows = buildAvailabilityWindows([
      slot('17:00:00', '18:00:00'),
      slot('18:00:00', '19:00:00', { action_type: 'instant_book' }),
      slot('18:00:00', '19:00:00', { action_type: 'info_only_open_gym' }),
      slot('19:00:00', '20:00:00', { action_type: 'info_only_open_gym' }),
    ], null, now)
    expect(windows).toHaveLength(3)
  })
  it('enforces a hard cutoff including exact equality and never invents a clipped booking', () => {
    const windows = buildAvailabilityWindows([
      slot('14:00:00', '16:00:00'), slot('15:00:00', '16:00:00'), slot('16:00:00', '17:00:00'),
      slot('14:00:00', '15:00:00', { action_type: 'info_only_open_gym' }),
    ], { min_advance_lead_time_hours: 48 }, now)
    expect(windows.find(w => w.action_type === 'request_private')?.start_time).toBe('15:00:00')
    expect(windows.flatMap(w => w.slots).filter(s => s.action_type === 'request_private')).toHaveLength(2)
    expect(windows.some(w => w.action_type === 'info_only_open_gym')).toBe(true)
  })
  it('adds day and hour requirements as elapsed hours across daylight saving', () => {
    const cutoff = getNoticeCutoff({ min_advance_booking_days: 2, min_advance_lead_time_hours: 1 }, new Date('2026-03-07T20:00:00Z'))
    expect(cutoff.toISOString()).toBe('2026-03-09T21:00:00.000Z')
    expect(getNoticeMinutesForDate('2026-03-09', cutoff)).toBe(14 * 60)
    expect(getNoticeMinutesForDate('2026-03-08', cutoff)).toBe(1440)
    expect(getNoticeMinutesForDate('2026-03-10', cutoff)).toBe(0)
  })
  it('preserves early and late availability for the outside-hours list', () => {
    expect(buildAvailabilityWindows([slot('06:00:00', '08:00:00'), slot('22:00:00', '23:00:00')], null, now)).toHaveLength(2)
  })
  it('places chained overlapping sessions in separate lanes without covering each other', () => {
    const windows = [
      slot('17:00:00', '18:00:00', { action_type: 'info_only_open_gym' }),
      slot('17:30:00', '18:30:00', { action_type: 'info_only_open_gym' }),
      slot('18:00:00', '19:00:00', { action_type: 'info_only_open_gym' }),
    ].map(slot => ({ ...slot, slots: [slot] }))
    expect(layoutAvailabilityWindows(windows).map(item => [item.lane, item.laneCount])).toEqual([[0, 2], [1, 2], [0, 2]])
  })
})

it('merges open gym across differing details, preserving the earliest details, gaps, dates and venues', () => {
  const gym = (start: string, end: string, overrides: Partial<ComputedAvailabilitySlot> = {}) => slot(start, end, { action_type: 'info_only_open_gym', ...overrides })
  const first = gym('14:00:00', '15:00:00', { slot_instance_id: 'first', modal_content: { title: 'First session', body: 'First details' } })
  const slots = [
    gym('16:00:00', '17:00:00', { slot_instance_id: 'last' }),
    first,
    gym('15:00:00', '16:00:00', { slot_instance_id: 'middle', modal_content: { title: 'Different session', body: 'Different details' } }),
    gym('18:00:00', '19:00:00'),
    gym('17:00:00', '18:00:00', { date: '2026-09-07' }),
    gym('17:00:00', '18:00:00', { venue_id: 'other' }),
  ]
  const windows = buildAvailabilityWindows(slots, null, new Date('2026-09-04T22:00:00Z'))
  expect(windows).toHaveLength(4)
  expect(windows[0]).toEqual({ ...first, end_time: '17:00:00', slots: [first, slots[2], slots[0]] })
  expect(first.end_time).toBe('15:00:00')
})
