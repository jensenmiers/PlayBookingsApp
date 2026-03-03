/**
 * @jest-environment node
 */

export {}

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockValidateRequest = jest.fn()
const mockCreateAdminClient = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))

jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))

jest.mock('@/middleware/validationMiddleware', () => ({
  validateRequest: (...args: unknown[]) => mockValidateRequest(...args),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

type RouteContext = { params: Promise<{ id: string }> }

function createContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  }
}

function createAdminClientMock() {
  const venue = {
    id: 'venue-1',
    hourly_rate: 60,
    amenities: ['lights'],
    instant_booking: true,
  }

  const venueSingle = jest
    .fn()
    .mockResolvedValueOnce({ data: venue, error: null })
    .mockResolvedValueOnce({ data: venue, error: null })
  const venueEq = jest.fn(() => ({ single: venueSingle }))
  const venueSelect = jest.fn(() => ({ eq: venueEq }))
  const venueUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const venueUpdate = jest.fn(() => ({ eq: venueUpdateEq }))

  const configMaybeSingle = jest
    .fn()
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: null, error: null })
  const configEq = jest.fn(() => ({ maybeSingle: configMaybeSingle }))
  const configSelect = jest.fn(() => ({ eq: configEq }))
  const configUpsert = jest.fn().mockResolvedValue({ error: null })

  const templatesFinalEq = jest
    .fn()
    .mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValueOnce({ data: [], error: null })
  const templatesIn = jest.fn(() => ({ eq: templatesFinalEq }))
  const templatesEq = jest.fn(() => ({ in: templatesIn }))
  const templatesSelect = jest.fn(() => ({ eq: templatesEq }))
  const templateDeleteRegularIn = jest.fn().mockResolvedValue({ error: null })
  const templateDeleteDropInEq = jest.fn().mockResolvedValue({ error: null })
  const templateDeleteVenueEq = jest.fn(() => ({
    eq: templateDeleteDropInEq,
    in: templateDeleteRegularIn,
  }))
  const templatesDelete = jest.fn(() => ({ eq: templateDeleteVenueEq }))
  const templatesInsert = jest.fn().mockResolvedValue({ error: null })

  const regularSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const regularSyncEq = jest.fn(() => ({ maybeSingle: regularSyncMaybeSingle }))
  const regularSyncSelect = jest.fn(() => ({ eq: regularSyncEq }))

  const dropInSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const dropInSyncEq = jest.fn(() => ({ maybeSingle: dropInSyncMaybeSingle }))
  const dropInSyncSelect = jest.fn(() => ({ eq: dropInSyncEq }))

  const calendarIntegrationMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const calendarIntegrationEq = jest.fn(() => ({ maybeSingle: calendarIntegrationMaybeSingle }))
  const calendarIntegrationSelect = jest.fn(() => ({ eq: calendarIntegrationEq }))

  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const rpc = jest.fn().mockResolvedValue({ error: null })

  const from = jest.fn((table: string) => {
    if (table === 'venues') {
      return { select: venueSelect, update: venueUpdate }
    }
    if (table === 'venue_admin_configs') {
      return { select: configSelect, upsert: configUpsert }
    }
    if (table === 'slot_templates') {
      return { select: templatesSelect, delete: templatesDelete, insert: templatesInsert }
    }
    if (table === 'regular_template_sync_queue') {
      return { select: regularSyncSelect }
    }
    if (table === 'drop_in_template_sync_queue') {
      return { select: dropInSyncSelect }
    }
    if (table === 'venue_calendar_integrations') {
      return { select: calendarIntegrationSelect }
    }
    if (table === 'audit_logs') {
      return { insert: auditInsert }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from, rpc },
    calls: { rpc, templatesInsert, templateDeleteRegularIn },
  }
}

describe('PATCH /api/admin/venues/[id]', () => {
  let PATCH: (request: Request, context: RouteContext) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/[id]/route')
    PATCH = route.PATCH as (request: Request, context: RouteContext) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
  })

  it('uses current RPC parameter names for inline slot refresh', async () => {
    const { client, calls } = createAdminClientMock()
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      drop_in_enabled: false,
    })

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ drop_in_enabled: false }),
      }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)

    const refreshCall = calls.rpc.mock.calls.find(
      ([fnName]: [string, Record<string, unknown>]) => fnName === 'refresh_slot_instances_from_templates'
    )

    expect(refreshCall).toBeDefined()
    expect(refreshCall?.[1]).toEqual(
      expect.objectContaining({
        p_venue_id: 'venue-1',
        p_date_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        p_date_to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    expect(refreshCall?.[1]).not.toHaveProperty('p_start_date')
    expect(refreshCall?.[1]).not.toHaveProperty('p_end_date')
  })

  it('derives regular templates from operating_hours updates', async () => {
    const { client, calls } = createAdminClientMock()
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      operating_hours: [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
        { day_of_week: 3, start_time: '14:00', end_time: '17:00' },
      ],
    })

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operating_hours: [] }),
      }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(calls.templateDeleteRegularIn).toHaveBeenCalledWith('action_type', ['instant_book', 'request_private'])
    expect(calls.templatesInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          venue_id: 'venue-1',
          name: 'Regular Booking Window 1',
          action_type: 'instant_book',
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '12:00:00',
        }),
      ])
    )
  })

  it('rejects regular_booking_templates patches', async () => {
    const { client } = createAdminClientMock()
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      regular_booking_templates: [
        { day_of_week: 1, start_time: '09:00', end_time: '12:00' },
      ],
    })

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ regular_booking_templates: [] }),
      }),
      createContext('venue-1')
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.success).toBe(false)
    expect(json.error?.message).toBe(
      'regular_booking_templates is deprecated; update operating_hours instead'
    )
  })
})
