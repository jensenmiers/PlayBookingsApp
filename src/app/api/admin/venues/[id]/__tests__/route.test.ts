/**
 * @jest-environment node
 */

export {}

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockValidateRequest = jest.fn()
const mockCreateAdminClient = jest.fn()
const mockSyncVenueCalendarByVenueId = jest.fn()

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

jest.mock('@/services/googleCalendarIntegrationService', () => ({
  syncVenueCalendarByVenueId: (...args: unknown[]) => mockSyncVenueCalendarByVenueId(...args),
}))

type RouteContext = { params: Promise<{ id: string }> }

function createContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  }
}

function createAdminClientMock(args?: {
  calendarIntegrationRow?: Record<string, unknown> | null
}) {
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

  const calendarIntegrationMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: args?.calendarIntegrationRow ?? null, error: null })
  const calendarIntegrationEq = jest.fn(() => ({ maybeSingle: calendarIntegrationMaybeSingle }))
  const calendarIntegrationSelect = jest.fn(() => ({ eq: calendarIntegrationEq }))

  const publishStateMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const publishStateEq = jest.fn(() => ({ maybeSingle: publishStateMaybeSingle }))
  const publishStateSelect = jest.fn(() => ({ eq: publishStateEq }))
  const publishStateUpsert = jest.fn().mockResolvedValue({ error: null })

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
    if (table === 'venue_availability_publish_states') {
      return { select: publishStateSelect, upsert: publishStateUpsert }
    }
    if (table === 'audit_logs') {
      return { insert: auditInsert }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from, rpc },
    calls: { rpc, templatesInsert, templateDeleteRegularIn, publishStateUpsert },
  }
}

function createAdminClientMockForGet({
  templateRows,
}: {
  templateRows: Array<{
    venue_id: string
    name: string
    action_type: 'instant_book' | 'request_private' | 'info_only_open_gym'
    day_of_week: number
    start_time: string
    end_time: string
  }>
}) {
  const venue = {
    id: 'venue-1',
    hourly_rate: 60,
    amenities: ['lights'],
    instant_booking: true,
  }

  const venueSingle = jest.fn().mockResolvedValue({ data: venue, error: null })
  const venueEq = jest.fn(() => ({ single: venueSingle }))
  const venueSelect = jest.fn(() => ({ eq: venueEq }))

  const configMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const configEq = jest.fn(() => ({ maybeSingle: configMaybeSingle }))
  const configSelect = jest.fn(() => ({ eq: configEq }))

  const templatesFinalEq = jest.fn().mockResolvedValue({ data: templateRows, error: null })
  const templatesIn = jest.fn(() => ({ eq: templatesFinalEq }))
  const templatesEq = jest.fn(() => ({ in: templatesIn }))
  const templatesSelect = jest.fn(() => ({ eq: templatesEq }))

  const regularSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const regularSyncEq = jest.fn(() => ({ maybeSingle: regularSyncMaybeSingle }))
  const regularSyncSelect = jest.fn(() => ({ eq: regularSyncEq }))

  const dropInSyncMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const dropInSyncEq = jest.fn(() => ({ maybeSingle: dropInSyncMaybeSingle }))
  const dropInSyncSelect = jest.fn(() => ({ eq: dropInSyncEq }))

  const calendarIntegrationMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const calendarIntegrationEq = jest.fn(() => ({ maybeSingle: calendarIntegrationMaybeSingle }))
  const calendarIntegrationSelect = jest.fn(() => ({ eq: calendarIntegrationEq }))

  const publishStateMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
  const publishStateEq = jest.fn(() => ({ maybeSingle: publishStateMaybeSingle }))
  const publishStateSelect = jest.fn(() => ({ eq: publishStateEq }))

  const from = jest.fn((table: string) => {
    if (table === 'venues') {
      return { select: venueSelect }
    }
    if (table === 'venue_admin_configs') {
      return { select: configSelect }
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
    if (table === 'venue_calendar_integrations') {
      return { select: calendarIntegrationSelect }
    }
    if (table === 'venue_availability_publish_states') {
      return { select: publishStateSelect }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from },
    calls: { templatesIn },
  }
}

describe('GET /api/admin/venues/[id]', () => {
  let GET: (request: Request, context: RouteContext) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/[id]/route')
    GET = route.GET as (request: Request, context: RouteContext) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
    mockSyncVenueCalendarByVenueId.mockResolvedValue({
      venueId: 'venue-1',
      upsertedCount: 1,
      cancelledCount: 0,
      syncedAt: '2026-03-07T11:30:00.000Z',
      nextSyncAt: '2026-03-07T11:35:00.000Z',
    })
  })

  it('includes only regular action types in regular_booking_templates', async () => {
    const { client } = createAdminClientMockForGet({
      templateRows: [
        {
          venue_id: 'venue-1',
          name: 'Drop-In Window 1',
          action_type: 'info_only_open_gym',
          day_of_week: 2,
          start_time: '11:00:00',
          end_time: '12:00:00',
        },
        {
          venue_id: 'venue-1',
          name: 'Random Name But Regular',
          action_type: 'instant_book',
          day_of_week: 1,
          start_time: '09:00:00',
          end_time: '10:00:00',
        },
        {
          venue_id: 'venue-1',
          name: 'Another Regular Window',
          action_type: 'request_private',
          day_of_week: 3,
          start_time: '18:00:00',
          end_time: '19:00:00',
        },
      ],
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET(new Request('http://localhost/api/admin/venues/venue-1'), createContext('venue-1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.regular_booking_templates).toEqual([
      { day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' },
      { day_of_week: 3, start_time: '18:00:00', end_time: '19:00:00' },
    ])
    expect(json.data.regular_booking_templates).not.toContainEqual(
      expect.objectContaining({ day_of_week: 2, start_time: '11:00:00', end_time: '12:00:00' })
    )
  })

  it('dedupes regular templates by day/start/end window', async () => {
    const { client } = createAdminClientMockForGet({
      templateRows: [
        {
          venue_id: 'venue-1',
          name: 'Regular A',
          action_type: 'instant_book',
          day_of_week: 5,
          start_time: '20:00:00',
          end_time: '21:00:00',
        },
        {
          venue_id: 'venue-1',
          name: 'Regular B',
          action_type: 'request_private',
          day_of_week: 5,
          start_time: '20:00:00',
          end_time: '21:00:00',
        },
        {
          venue_id: 'venue-1',
          name: 'Regular C',
          action_type: 'request_private',
          day_of_week: 1,
          start_time: '08:00:00',
          end_time: '09:00:00',
        },
      ],
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET(new Request('http://localhost/api/admin/venues/venue-1'), createContext('venue-1'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.regular_booking_templates).toEqual([
      { day_of_week: 1, start_time: '08:00:00', end_time: '09:00:00' },
      { day_of_week: 5, start_time: '20:00:00', end_time: '21:00:00' },
    ])
  })
})

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

  it('does not run blocking publish work for non-availability saves', async () => {
    const { client, calls } = createAdminClientMock()
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      hourly_rate: 125,
    })

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hourly_rate: 125 }),
      }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(calls.rpc).not.toHaveBeenCalledWith(
      'refresh_slot_instances_from_templates',
      expect.any(Object)
    )
    expect(mockSyncVenueCalendarByVenueId).not.toHaveBeenCalled()
  })

  it('returns success with needs_attention when immediate slot publish fails after persistence', async () => {
    const { client, calls } = createAdminClientMock()
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      drop_in_enabled: false,
    })
    calls.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'enqueue_drop_in_template_sync') {
        return { error: null }
      }
      if (fnName === 'refresh_slot_instances_from_templates') {
        return { error: { message: 'inline refresh timeout' } }
      }
      return { error: null }
    })

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ drop_in_enabled: false }),
      }),
      createContext('venue-1')
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('needs attention')
    expect(json.data.availability_publish.status).toBe('needs_attention')
    expect(calls.publishStateUpsert).toHaveBeenCalled()
  })

  it('returns success with needs_attention when immediate Google sync fails after persistence', async () => {
    const { client } = createAdminClientMock({
      calendarIntegrationRow: {
        provider: 'google_calendar',
        google_calendar_id: 'primary',
        google_calendar_name: 'Primary',
        google_account_email: 'primary@example.com',
        status: 'connected',
        sync_enabled: true,
        sync_interval_minutes: 5,
        last_synced_at: null,
        next_sync_at: null,
        last_error: null,
        updated_at: null,
      },
    })
    mockCreateAdminClient.mockReturnValue(client)
    mockValidateRequest.mockResolvedValue({
      min_advance_booking_days: 2,
    })
    mockSyncVenueCalendarByVenueId.mockRejectedValue(new Error('Google sync timeout'))

    const response = await PATCH(
      new Request('http://localhost/api/admin/venues/venue-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ min_advance_booking_days: 2 }),
      }),
      createContext('venue-1')
    )
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('needs attention')
    expect(json.data.availability_publish.status).toBe('needs_attention')
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
