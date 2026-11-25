/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '../route'

const mockFrom = jest.fn()
const mockAvailable = jest.fn()
jest.mock('@/lib/supabase/public-server', () => ({ createPublicServerClient: () => ({ from: mockFrom }) }))
jest.mock('@/services/availabilityService', () => ({ AvailabilityService: jest.fn().mockImplementation(() => ({ getAvailableSlots: mockAvailable, getPublishedThrough: jest.fn().mockResolvedValue('2026-12-01') })) }))

it('returns the published horizon independently of eligible availability', async () => {
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [{ date: '2026-12-01' }], error: null }), single: jest.fn().mockResolvedValue({ data: { id: 'v' }, error: null }) }
  mockFrom.mockReturnValue(query)
  mockAvailable.mockResolvedValue([])
  const response = await GET(new NextRequest('http://localhost/api/venues/v/availability?date_from=2027-01-01&date_to=2027-01-07'), { params: Promise.resolve({ id: 'v' }) })
  expect(await response.json()).toEqual({ success: true, data: [], published_through: '2026-12-01' })
})
