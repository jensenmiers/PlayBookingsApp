import { bookingQuerySchema } from '../booking'

describe('bookingQuerySchema', () => {
  it('accepts time_view=upcoming', () => {
    const parsed = bookingQuerySchema.parse({ time_view: 'upcoming' })

    expect(parsed.time_view).toBe('upcoming')
  })

  it('rejects unsupported time_view values', () => {
    expect(() => bookingQuerySchema.parse({ time_view: 'all' })).toThrow()
  })
})
