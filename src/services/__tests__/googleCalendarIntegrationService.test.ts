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
  completeCalendarOAuthConnection,
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

function createAdminClientMock(args?: {
  integrationRow?: IntegrationRow | null
  tokenRow?: TokenRow | null
}) {
  const calls = {
    integrationUpserts: [] as Array<Record<string, unknown>>,
    tokenUpserts: [] as Array<Record<string, unknown>>,
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
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = 'google-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  afterAll(() => {
    process.env.GOOGLE_CLIENT_ID = envSnapshot.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_SECRET = envSnapshot.GOOGLE_CLIENT_SECRET
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
      redirectUri: 'http://localhost/api/admin/venues/venue-1/calendar/callback',
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
