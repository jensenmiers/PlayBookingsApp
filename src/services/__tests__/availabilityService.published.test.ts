import { AvailabilityService } from '../availabilityService'
import type { SupabaseClient } from '@supabase/supabase-js'

it('reads the last active published date even if none of its times are eligible', async () => {
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [{ date: '2026-12-01' }], error: null }) }
  const from = jest.fn(() => query)
  const service = new AvailabilityService({ getClient: async () => ({ from }) as unknown as SupabaseClient })
  expect(await service.getPublishedThrough('v')).toBe('2026-12-01')
  expect(from).toHaveBeenCalledWith('slot_instances')
  expect(query.eq).toHaveBeenCalledWith('venue_id', 'v')
  expect(query.eq).toHaveBeenCalledWith('is_active', true)
  expect(query.order).toHaveBeenCalledWith('date', { ascending: false })
  query.limit.mockResolvedValueOnce({ data: [], error: null })
  expect(await service.getPublishedThrough('v')).toBeNull()
})
