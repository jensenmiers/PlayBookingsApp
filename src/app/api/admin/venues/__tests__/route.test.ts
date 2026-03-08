/**
 * @jest-environment node
 */

export {}

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockCreateAdminClient = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))

jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

function createAdminClientMock(args?: {
  regularSyncRow?: Record<string, unknown> | null
  dropInSyncRow?: Record<string, unknown> | null
  calendarIntegrationRow?: Record<string, unknown> | null
  publishStateRow?: Record<string, unknown> | null
}) {
  const venuesOrder = jest.fn().mockResolvedValue({
    data: [
      {
        id: 'venue-1',
        name: 'Alpha Gym',
        hourly_rate: 100,
        amenities: [],
        instant_booking: true,
        insurance_required: false,
        max_advance_booking_days: 60,
        photos: [],
        is_active: true,
      },
    ],
    error: null,
  })
  const venuesSelect = jest.fn(() => ({ order: venuesOrder }))

  const configSelect = jest.fn().mockResolvedValue({
    data: [],
    error: null,
  })

  const templatesEq = jest.fn().mockResolvedValue({
    data: [],
    error: null,
  })
  const templatesIn = jest.fn(() => ({ eq: templatesEq }))
  const templatesSelect = jest.fn(() => ({ in: templatesIn }))

  const regularSyncSelect = jest.fn().mockResolvedValue({
    data: args?.regularSyncRow ? [args.regularSyncRow] : [],
    error: null,
  })
  const dropInSyncSelect = jest.fn().mockResolvedValue({
    data: args?.dropInSyncRow ? [args.dropInSyncRow] : [],
    error: null,
  })
  const calendarIntegrationSelect = jest.fn().mockResolvedValue({
    data: args?.calendarIntegrationRow ? [{ venue_id: 'venue-1', ...args.calendarIntegrationRow }] : [],
    error: null,
  })
  const publishStateSelect = jest.fn().mockResolvedValue({
    data: args?.publishStateRow ? [{ venue_id: 'venue-1', ...args.publishStateRow }] : [],
    error: null,
  })

  const from = jest.fn((table: string) => {
    if (table === 'venues') {
      return { select: venuesSelect }
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

  return { client: { from } }
}

describe('GET /api/admin/venues', () => {
  let GET: () => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/admin/venues/route')
    GET = route.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
  })

  it('derives updating_future_availability when backfill is queued and no publish error exists', async () => {
    const { client } = createAdminClientMock({
      dropInSyncRow: {
        venue_id: 'venue-1',
        reason: 'drop_in_templates_updated',
        run_after: '2026-03-07T12:00:00.000Z',
        last_error: null,
        updated_at: '2026-03-07T11:00:00.000Z',
      },
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data[0].availability_publish).toEqual(
      expect.objectContaining({
        status: 'updating_future_availability',
        last_error: null,
      })
    )
  })

  it('derives needs_attention from publish-state errors', async () => {
    const { client } = createAdminClientMock({
      publishStateRow: {
        last_published_at: '2026-03-07T11:30:00.000Z',
        last_publish_error: 'Google API timeout',
        last_publish_error_source: 'google_block_sync',
        updated_at: '2026-03-07T11:35:00.000Z',
      },
      calendarIntegrationRow: {
        provider: 'google_calendar',
        google_calendar_id: 'primary',
        google_calendar_name: 'Primary',
        google_account_email: 'primary@example.com',
        status: 'connected',
        sync_enabled: true,
        sync_interval_minutes: 5,
        last_synced_at: '2026-03-07T11:20:00.000Z',
        next_sync_at: '2026-03-07T11:25:00.000Z',
        last_error: null,
        updated_at: '2026-03-07T11:20:00.000Z',
      },
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data[0].availability_publish).toEqual(
      expect.objectContaining({
        status: 'needs_attention',
        last_error: 'Google API timeout',
        last_error_source: 'google_block_sync',
      })
    )
  })

  it('derives ready_for_renters when there is no backfill or publish error', async () => {
    const { client } = createAdminClientMock({
      publishStateRow: {
        last_published_at: '2026-03-07T11:30:00.000Z',
        last_publish_error: null,
        last_publish_error_source: null,
        updated_at: '2026-03-07T11:30:00.000Z',
      },
    })
    mockCreateAdminClient.mockReturnValue(client)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data[0].availability_publish).toEqual(
      expect.objectContaining({
        status: 'ready_for_renters',
        last_error: null,
        last_error_source: null,
      })
    )
  })
})
