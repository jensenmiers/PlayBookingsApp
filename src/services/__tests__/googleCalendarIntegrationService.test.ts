/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/tokenCrypto', () => ({
  encryptSecret: (value: string) => `enc:${value}`,
  decryptSecret: (value: string) => value.replace(/^enc:/, ''),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildGoogleCalendarAuthUrl,
  completeCalendarOAuthConnection,
  getCalendarCallbackUrl,
  resolveVenueCalendarOAuthState,
  selectVenueCalendar,
} from '../googleCalendarIntegrationService'

type IntegrationRow = {
  venue_id: string
  provider: string
  google_calendar_id: string | null
  google_calendar_name: string | null
  google_account_email: string | null
  status: 'disconnected' | 'connected' | 'error'
  sync_enabled: boolean
  sync_interval_minutes: number
  last_synced_at: string | null
  next_sync_at: string | null
  sync_cursor: string | null
  last_error: string | null
  updated_by: string | null
  updated_at: string | null
}

type TokenRow = {
  venue_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  access_token_expires_at: string | null
  scopes: string[]
}

type OAuthStateRow = {
  state_nonce: string
  venue_id: string
  initiated_by_user_id: string
  expires_at: string
  used_at: string | null
  created_at?: string | null
}

function createAdminClientMock(args?: {
  integrationRow?: IntegrationRow | null
  tokenRow?: TokenRow | null
  oauthStateRow?: OAuthStateRow | null
}) {
  const calls = {
    integrationUpserts: [] as Array<Record<string, unknown>>,
    tokenUpserts: [] as Array<Record<string, unknown>>,
    oauthStateInserts: [] as Array<Record<string, unknown>>,
    oauthStateUpdates: [] as Array<Record<string, unknown>>,
  }

  const integrationMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: args?.integrationRow ?? null, error: null })
  const integrationEq = jest.fn(() => ({ maybeSingle: integrationMaybeSingle }))
  const integrationSelect = jest.fn(() => ({ eq: integrationEq }))
  const integrationUpsert = jest.fn(async (payload: Record<string, unknown>) => {
    calls.integrationUpserts.push(payload)
    return { error: null }
  })

  const tokenMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: args?.tokenRow ?? null, error: null })
  const tokenEq = jest.fn(() => ({ maybeSingle: tokenMaybeSingle }))
  const tokenSelect = jest.fn(() => ({ eq: tokenEq }))
  const tokenUpsert = jest.fn(async (payload: Record<string, unknown>) => {
    calls.tokenUpserts.push(payload)
    return { error: null }
  })

  const tokenUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const tokenUpdate = jest.fn(() => ({ eq: tokenUpdateEq }))

  const oauthStateMaybeSingle = jest
    .fn()
    .mockResolvedValue({ data: args?.oauthStateRow ?? null, error: null })
  const oauthStateEq = jest.fn(() => ({ maybeSingle: oauthStateMaybeSingle }))
  const oauthStateSelect = jest.fn(() => ({ eq: oauthStateEq }))
  const oauthStateInsert = jest.fn(async (payload: Record<string, unknown>) => {
    calls.oauthStateInserts.push(payload)
    return { error: null }
  })
  const oauthStateUpdateIs = jest.fn().mockResolvedValue({ error: null })
  const oauthStateUpdateEq = jest.fn(() => ({ is: oauthStateUpdateIs }))
  const oauthStateUpdate = jest.fn((payload: Record<string, unknown>) => {
    calls.oauthStateUpdates.push(payload)
    return { eq: oauthStateUpdateEq }
  })

  const from = jest.fn((table: string) => {
    if (table === 'venue_calendar_integrations') {
      return {
        select: integrationSelect,
        upsert: integrationUpsert,
      }
    }
    if (table === 'venue_calendar_tokens') {
      return {
        select: tokenSelect,
        upsert: tokenUpsert,
        update: tokenUpdate,
      }
    }
    if (table === 'venue_calendar_oauth_states') {
      return {
        select: oauthStateSelect,
        insert: oauthStateInsert,
        update: oauthStateUpdate,
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return {
    client: { from },
    calls,
  }
}

describe('googleCalendarIntegrationService', () => {
  const originalFetch = global.fetch
  const envSnapshot = {
    GOOGLE_CALENDAR_CLIENT_ID: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'google-calendar-client-id'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'google-calendar-client-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  afterAll(() => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = envSnapshot.GOOGLE_CALENDAR_CLIENT_ID
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = envSnapshot.GOOGLE_CALENDAR_CLIENT_SECRET
  })

  it('builds auth urls with the static callback and persists an oauth state nonce', async () => {
    const { client, calls } = createAdminClientMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const authUrl = await buildGoogleCalendarAuthUrl({
      origin: 'http://localhost:3000',
      venueId: 'venue-1',
      userId: 'super-admin-1',
    })

    const parsedUrl = new URL(authUrl)
    const state = parsedUrl.searchParams.get('state')

    expect(parsedUrl.searchParams.get('client_id')).toBe('google-calendar-client-id')
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/admin/google-calendar/callback'
    )
    expect(getCalendarCallbackUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/api/admin/google-calendar/callback'
    )
    expect(state).toEqual(expect.any(String))
    expect(calls.oauthStateInserts).toHaveLength(1)
    expect(calls.oauthStateInserts[0]).toEqual(
      expect.objectContaining({
        state_nonce: state,
        venue_id: 'venue-1',
        initiated_by_user_id: 'super-admin-1',
      })
    )
    expect(calls.oauthStateInserts[0].expires_at).toEqual(expect.any(String))
  })

  it('rejects expired oauth state records', async () => {
    const { client } = createAdminClientMock({
      oauthStateRow: {
        state_nonce: 'expired-state',
        venue_id: 'venue-1',
        initiated_by_user_id: 'super-admin-1',
        expires_at: '2000-01-01T00:00:00.000Z',
        used_at: null,
      },
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const result = await resolveVenueCalendarOAuthState({
      state: 'expired-state',
      userId: 'super-admin-1',
    })

    expect(result).toBeNull()
  })

  it('rejects already-used oauth state records', async () => {
    const { client } = createAdminClientMock({
      oauthStateRow: {
        state_nonce: 'used-state',
        venue_id: 'venue-1',
        initiated_by_user_id: 'super-admin-1',
        expires_at: '2099-01-01T00:00:00.000Z',
        used_at: '2026-03-05T00:00:00.000Z',
      },
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const result = await resolveVenueCalendarOAuthState({
      state: 'used-state',
      userId: 'super-admin-1',
    })

    expect(result).toBeNull()
  })

  it('rejects oauth state records created by a different user', async () => {
    const { client } = createAdminClientMock({
      oauthStateRow: {
        state_nonce: 'other-user-state',
        venue_id: 'venue-1',
        initiated_by_user_id: 'different-admin',
        expires_at: '2099-01-01T00:00:00.000Z',
        used_at: null,
      },
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const result = await resolveVenueCalendarOAuthState({
      state: 'other-user-state',
      userId: 'super-admin-1',
    })

    expect(result).toBeNull()
  })

  it('keeps sync disabled after OAuth completion until a calendar is selected', async () => {
    const { client, calls } = createAdminClientMock()
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'google-access',
          refresh_token: 'google-refresh',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            { id: 'primary@example.com', summary: 'Primary', primary: true },
          ],
        }),
      })
    global.fetch = fetchMock as unknown as typeof global.fetch

    await completeCalendarOAuthConnection({
      venueId: 'venue-1',
      userId: 'super-admin-1',
      code: 'oauth-code',
      redirectUri: 'http://localhost/api/admin/google-calendar/callback',
    })

    expect(calls.tokenUpserts).toHaveLength(1)
    expect(calls.integrationUpserts).toHaveLength(1)
    expect(calls.integrationUpserts[0]).toEqual(
      expect.objectContaining({
        venue_id: 'venue-1',
        provider: 'google_calendar',
        status: 'connected',
        google_calendar_id: null,
        google_calendar_name: null,
        sync_enabled: false,
        next_sync_at: null,
        sync_cursor: null,
        last_error: null,
      })
    )
  })

  it('enables sync and schedules next_sync_at after calendar selection', async () => {
    const { client, calls } = createAdminClientMock({
      integrationRow: {
        venue_id: 'venue-1',
        provider: 'google_calendar',
        google_calendar_id: null,
        google_calendar_name: null,
        google_account_email: 'primary@example.com',
        status: 'connected',
        sync_enabled: false,
        sync_interval_minutes: 5,
        last_synced_at: null,
        next_sync_at: null,
        sync_cursor: null,
        last_error: null,
        updated_by: 'super-admin-1',
        updated_at: null,
      },
      tokenRow: {
        venue_id: 'venue-1',
        access_token_encrypted: 'enc:still-valid-access-token',
        refresh_token_encrypted: 'enc:refresh-token',
        access_token_expires_at: '2099-01-01T00:00:00.000Z',
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      },
    })
    ;(createAdminClient as jest.Mock).mockReturnValue(client)

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 'calendar-a', summary: 'Calendar A', primary: false },
          { id: 'calendar-b', summary: 'Calendar B', primary: true },
        ],
      }),
    })
    global.fetch = fetchMock as unknown as typeof global.fetch

    await selectVenueCalendar({
      venueId: 'venue-1',
      userId: 'super-admin-1',
      calendarId: 'calendar-b',
      calendarName: 'Calendar B',
    })

    expect(calls.integrationUpserts).toHaveLength(1)
    expect(calls.integrationUpserts[0]).toEqual(
      expect.objectContaining({
        venue_id: 'venue-1',
        provider: 'google_calendar',
        google_calendar_id: 'calendar-b',
        google_calendar_name: 'Calendar B',
        status: 'connected',
        sync_enabled: true,
        sync_cursor: null,
        last_error: null,
      })
    )
    expect(calls.integrationUpserts[0].next_sync_at).toEqual(expect.any(String))
  })
})
