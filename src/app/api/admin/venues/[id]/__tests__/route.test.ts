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

  const regularSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const regularSyncEq = jest.fn(() => ({ maybeSingle: regularSyncMaybeSingle }))
  const regularSyncSelect = jest.fn(() => ({ eq: regularSyncEq }))

  const dropInSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const dropInSyncEq = jest.fn(() => ({ maybeSingle: dropInSyncMaybeSingle }))
  const dropInSyncSelect = jest.fn(() => ({ eq: dropInSyncEq }))

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
      return { select: templatesSelect }
    }
    if (table === 'regular_template_sync_queue') {
      return { select: regularSyncSelect }
    }
    if (table === 'drop_in_template_sync_queue') {
      return { select: dropInSyncSelect }
    }
    if (table === 'audit_logs') {
      return { insert: auditInsert }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from, rpc },
    calls: { rpc },
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
})
