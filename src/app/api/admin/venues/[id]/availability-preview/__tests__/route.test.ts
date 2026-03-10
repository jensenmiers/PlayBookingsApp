/**
 * @jest-environment node
 */

export {}

import { forbidden } from '@/utils/errorHandling'

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockValidateRequest = jest.fn()
const mockGetPreview = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))

jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))

jest.mock('@/middleware/validationMiddleware', () => ({
  validateRequest: (...args: unknown[]) => mockValidateRequest(...args),
}))

jest.mock('@/services/adminAvailabilityPreviewService', () => ({
  AdminAvailabilityPreviewService: jest.fn().mockImplementation(() => ({
    getVenueAvailabilityPreview: (...args: unknown[]) => mockGetPreview(...args),
  })),
}))

type RouteContext = { params: Promise<{ id: string }> }

function createContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  }
}

describe('POST /api/admin/venues/[id]/availability-preview', () => {
  let POST: (request: Request, context: RouteContext) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/[id]/availability-preview/route')
    POST = route.POST as (request: Request, context: RouteContext) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
    mockValidateRequest.mockResolvedValue({
      operating_hours: [],
      drop_in_enabled: false,
      drop_in_templates: [],
      min_advance_booking_days: 0,
      min_advance_lead_time_hours: 0,
      blackout_dates: [],
      holiday_dates: [],
    })
  })

  it('returns a 403 when the caller is not a super-admin', async () => {
    mockRequireSuperAdmin.mockImplementation(() => {
      throw forbidden()
    })

    const response = await POST(new Request('http://localhost/api/admin/venues/venue-1/availability-preview', {
      method: 'POST',
      body: JSON.stringify({}),
    }), createContext('venue-1'))

    expect(response.status).toBe(403)
  })

  it('returns a live-only preview payload when there are no unpublished changes', async () => {
    mockGetPreview.mockResolvedValue({
      days: ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15', '2026-03-16'],
      live_preview: [],
      draft_preview: [],
      changed_day_count: 0,
      has_unpublished_changes: false,
    })

    const response = await POST(new Request('http://localhost/api/admin/venues/venue-1/availability-preview', {
      method: 'POST',
      body: JSON.stringify({}),
    }), createContext('venue-1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.has_unpublished_changes).toBe(false)
    expect(json.data.changed_day_count).toBe(0)
    expect(json.data.days).toHaveLength(7)
  })

  it('returns draft and live previews when unpublished changes exist', async () => {
    mockGetPreview.mockResolvedValue({
      days: ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15', '2026-03-16'],
      live_preview: [{ date: '2026-03-10', private_booking: [], drop_in: [], reason_chips: [] }],
      draft_preview: [{ date: '2026-03-10', private_booking: [], drop_in: [], reason_chips: ['fully_booked'] }],
      changed_day_count: 1,
      has_unpublished_changes: true,
    })

    const response = await POST(new Request('http://localhost/api/admin/venues/venue-1/availability-preview', {
      method: 'POST',
      body: JSON.stringify({}),
    }), createContext('venue-1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.has_unpublished_changes).toBe(true)
    expect(json.data.changed_day_count).toBe(1)
    expect(json.data.live_preview[0].date).toBe('2026-03-10')
    expect(json.data.draft_preview[0].reason_chips).toEqual(['fully_booked'])
  })
})
