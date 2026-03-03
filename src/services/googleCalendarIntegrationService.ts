import { createHmac, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from '@/lib/tokenCrypto'
import { buildCalendarBlockMutations, type GoogleCalendarEventInput } from '@/lib/googleCalendarSync'
import { badRequest, internalError, notFound } from '@/utils/errorHandling'

const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
const GOOGLE_EVENTS_BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars'
const DEFAULT_SYNC_INTERVAL_MINUTES = 5
const DEFAULT_TIME_ZONE = 'America/Los_Angeles'

type TokenSet = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string | null
  scopes: string[]
}

type OAuthStatePayload = {
  venueId: string
  userId: string
  nonce: string
  exp: number
}

type VenueCalendarIntegrationRow = {
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

type VenueCalendarTokenRow = {
  venue_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  access_token_expires_at: string | null
  scopes: string[]
}

type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

type GoogleCalendarListResponse = {
  items?: Array<{
    id: string
    summary?: string
    primary?: boolean
  }>
}

type GoogleEventsResponse = {
  items?: GoogleCalendarEventInput[]
  nextPageToken?: string
  nextSyncToken?: string
}

function getRequiredEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
  const value = process.env[name]
  if (!value) {
    throw internalError(`Server misconfiguration: missing ${name}`)
  }
  return value
}

function getStateSigningSecret(): string {
  return process.env.GOOGLE_CALENDAR_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function getSyncIntervalMinutes(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
    return DEFAULT_SYNC_INTERVAL_MINUTES
  }
  return Math.floor(parsed)
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString()
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signState(payloadEncoded: string): string {
  const secret = getStateSigningSecret()
  if (!secret) {
    throw internalError('Server misconfiguration for calendar OAuth state')
  }
  return createHmac('sha256', secret).update(payloadEncoded).digest('base64url')
}

export function createCalendarOAuthState(venueId: string, userId: string): string {
  const payload: OAuthStatePayload = {
    venueId,
    userId,
    nonce: randomBytes(8).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  }

  const encoded = toBase64Url(JSON.stringify(payload))
  const signature = signState(encoded)
  return `${encoded}.${signature}`
}

export function verifyCalendarOAuthState(
  state: string,
  expectedVenueId: string,
  expectedUserId: string
): boolean {
  const [encodedPayload, signature] = state.split('.')
  if (!encodedPayload || !signature) {
    return false
  }
  if (signState(encodedPayload) !== signature) {
    return false
  }

  let payload: OAuthStatePayload
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as OAuthStatePayload
  } catch {
    return false
  }

  if (!payload || payload.exp < Date.now()) {
    return false
  }

  return payload.venueId === expectedVenueId && payload.userId === expectedUserId
}

export function getCalendarCallbackUrl(origin: string, venueId: string): string {
  return `${origin}/api/admin/venues/${venueId}/calendar/callback`
}

export function buildGoogleCalendarAuthUrl(args: {
  origin: string
  venueId: string
  userId: string
}): string {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID')
  const state = createCalendarOAuthState(args.venueId, args.userId)
  const redirectUri = getCalendarCallbackUrl(args.origin, args.venueId)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    state,
  })

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`
}

async function parseGoogleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw badRequest(`Google API request failed (${response.status}): ${body}`)
  }
  return (await response.json()) as T
}

function normalizeScopes(rawScope: string | undefined): string[] {
  if (!rawScope) {
    return []
  }
  return rawScope
    .split(' ')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

async function exchangeCodeForTokens(args: {
  code: string
  redirectUri: string
}): Promise<TokenSet> {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID')
  const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET')
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: args.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: args.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await parseGoogleJsonResponse<GoogleTokenResponse>(response)
  if (!data.access_token) {
    throw badRequest('Google OAuth token exchange did not return access_token')
  }
  if (!data.refresh_token) {
    throw badRequest('Google OAuth token exchange did not return refresh_token')
  }

  const expiresAt = Number.isFinite(data.expires_in)
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: expiresAt,
    scopes: normalizeScopes(data.scope),
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  accessTokenExpiresAt: string | null
  scopes: string[]
}> {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID')
  const clientSecret = getRequiredEnv('GOOGLE_CLIENT_SECRET')
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await parseGoogleJsonResponse<GoogleTokenResponse>(response)
  if (!data.access_token) {
    throw badRequest('Google token refresh did not return access_token')
  }

  const expiresAt = Number.isFinite(data.expires_in)
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: expiresAt,
    scopes: normalizeScopes(data.scope),
  }
}

async function fetchCalendars(accessToken: string): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  const data = await parseGoogleJsonResponse<GoogleCalendarListResponse>(response)
  return (data.items || [])
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      summary: item.summary || item.id,
      primary: Boolean(item.primary),
    }))
}

async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const response = await fetch(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  })

  // Google revoke endpoint can return 400 for already-invalid tokens. Treat as non-fatal.
  if (!response.ok && response.status !== 400) {
    const body = await response.text()
    throw badRequest(`Google token revoke failed (${response.status}): ${body}`)
  }
}

async function getIntegrationByVenueId(venueId: string): Promise<VenueCalendarIntegrationRow | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venue_calendar_integrations')
    .select(
      'venue_id, provider, google_calendar_id, google_calendar_name, google_account_email, status, sync_enabled, sync_interval_minutes, last_synced_at, next_sync_at, sync_cursor, last_error, updated_by, updated_at'
    )
    .eq('venue_id', venueId)
    .maybeSingle()

  const isMissingTable = error?.code === '42P01'
    || error?.message?.toLowerCase().includes('venue_calendar_integrations')
  if (error && !isMissingTable) {
    throw new Error(`Failed to load venue calendar integration: ${error.message}`)
  }
  if (isMissingTable || !data) {
    return null
  }

  return data as VenueCalendarIntegrationRow
}

async function getTokenByVenueId(venueId: string): Promise<VenueCalendarTokenRow | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venue_calendar_tokens')
    .select('venue_id, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, scopes')
    .eq('venue_id', venueId)
    .maybeSingle()

  const isMissingTable = error?.code === '42P01'
    || error?.message?.toLowerCase().includes('venue_calendar_tokens')
  if (error && !isMissingTable) {
    throw new Error(`Failed to load venue calendar token: ${error.message}`)
  }
  if (isMissingTable || !data) {
    return null
  }

  return data as VenueCalendarTokenRow
}

async function getActiveAccessToken(venueId: string): Promise<{
  accessToken: string
  refreshToken: string
}> {
  const adminClient = createAdminClient()
  const tokenRow = await getTokenByVenueId(venueId)
  if (!tokenRow) {
    throw badRequest('Google Calendar is not connected for this venue')
  }

  const refreshToken = decryptSecret(tokenRow.refresh_token_encrypted)
  const encryptedAccessToken = tokenRow.access_token_encrypted
  const expiresAt = tokenRow.access_token_expires_at ? new Date(tokenRow.access_token_expires_at).getTime() : 0
  const nowWithSkew = Date.now() + 30 * 1000
  if (expiresAt > nowWithSkew) {
    return {
      accessToken: decryptSecret(encryptedAccessToken),
      refreshToken,
    }
  }

  const refreshed = await refreshAccessToken(refreshToken)
  const { error: updateError } = await adminClient
    .from('venue_calendar_tokens')
    .update({
      access_token_encrypted: encryptSecret(refreshed.accessToken),
      access_token_expires_at: refreshed.accessTokenExpiresAt,
      scopes: refreshed.scopes.length > 0 ? refreshed.scopes : tokenRow.scopes,
    })
    .eq('venue_id', venueId)

  if (updateError) {
    throw new Error(`Failed to store refreshed Google access token: ${updateError.message}`)
  }

  return {
    accessToken: refreshed.accessToken,
    refreshToken,
  }
}

function getSyncWindowBounds(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const min = new Date(now)
  min.setDate(min.getDate() - 1)
  const max = new Date(now)
  max.setDate(max.getDate() + 180)
  return {
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
  }
}

async function fetchGoogleEvents(args: {
  accessToken: string
  calendarId: string
  syncCursor?: string | null
}): Promise<{ events: GoogleCalendarEventInput[]; nextSyncToken: string | null; usedFullSync: boolean }> {
  const events: GoogleCalendarEventInput[] = []
  let nextPageToken: string | null = null
  let nextSyncToken: string | null = null
  let usedFullSync = !args.syncCursor

  const requestPage = async (syncCursor: string | null) => {
    do {
      const url = new URL(
        `${GOOGLE_EVENTS_BASE_URL}/${encodeURIComponent(args.calendarId)}/events`
      )
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('showDeleted', 'true')
      url.searchParams.set('maxResults', '2500')
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken)
      }
      if (syncCursor) {
        url.searchParams.set('syncToken', syncCursor)
      } else {
        const bounds = getSyncWindowBounds()
        url.searchParams.set('timeMin', bounds.timeMin)
        url.searchParams.set('timeMax', bounds.timeMax)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        const text = await response.text()
        if (syncCursor && (response.status === 410 || text.toLowerCase().includes('sync token is no longer valid'))) {
          throw new Error('SYNC_CURSOR_EXPIRED')
        }
        throw badRequest(`Google calendar events sync failed (${response.status}): ${text}`)
      }

      const data = (await response.json()) as GoogleEventsResponse
      events.push(...(data.items || []))
      nextPageToken = data.nextPageToken || null
      nextSyncToken = data.nextSyncToken || nextSyncToken
    } while (nextPageToken)
  }

  try {
    await requestPage(args.syncCursor || null)
  } catch (error) {
    if (error instanceof Error && error.message === 'SYNC_CURSOR_EXPIRED') {
      usedFullSync = true
      nextPageToken = null
      nextSyncToken = null
      events.length = 0
      await requestPage(null)
    } else {
      throw error
    }
  }

  return {
    events,
    nextSyncToken,
    usedFullSync,
  }
}

export async function upsertVenueCalendarTokens(args: {
  venueId: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string | null
  scopes: string[]
}): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('venue_calendar_tokens')
    .upsert(
      {
        venue_id: args.venueId,
        access_token_encrypted: encryptSecret(args.accessToken),
        refresh_token_encrypted: encryptSecret(args.refreshToken),
        access_token_expires_at: args.accessTokenExpiresAt,
        scopes: args.scopes,
      },
      { onConflict: 'venue_id' }
    )

  if (error) {
    throw new Error(`Failed to persist Google calendar tokens: ${error.message}`)
  }
}

export async function completeCalendarOAuthConnection(args: {
  venueId: string
  userId: string
  code: string
  redirectUri: string
}): Promise<void> {
  const tokenSet = await exchangeCodeForTokens({
    code: args.code,
    redirectUri: args.redirectUri,
  })

  await upsertVenueCalendarTokens({
    venueId: args.venueId,
    accessToken: tokenSet.accessToken,
    refreshToken: tokenSet.refreshToken,
    accessTokenExpiresAt: tokenSet.accessTokenExpiresAt,
    scopes: tokenSet.scopes,
  })

  const calendars = await fetchCalendars(tokenSet.accessToken)
  const primaryCalendar = calendars.find((calendar) => calendar.primary) || calendars[0] || null
  const adminClient = createAdminClient()
  const { error: upsertError } = await adminClient
    .from('venue_calendar_integrations')
    .upsert(
      {
        venue_id: args.venueId,
        provider: 'google_calendar',
        google_account_email: primaryCalendar?.id || null,
        google_calendar_id: null,
        google_calendar_name: null,
        status: 'connected',
        sync_enabled: false,
        sync_interval_minutes: DEFAULT_SYNC_INTERVAL_MINUTES,
        sync_cursor: null,
        next_sync_at: null,
        last_error: null,
        updated_by: args.userId,
      },
      { onConflict: 'venue_id' }
    )

  if (upsertError) {
    throw new Error(`Failed to update venue calendar integration: ${upsertError.message}`)
  }
}

export async function listVenueCalendars(venueId: string): Promise<Array<{ id: string; summary: string; primary: boolean }>> {
  const { accessToken } = await getActiveAccessToken(venueId)
  return fetchCalendars(accessToken)
}

export async function selectVenueCalendar(args: {
  venueId: string
  userId: string
  calendarId: string
  calendarName?: string | null
}): Promise<void> {
  const integration = await getIntegrationByVenueId(args.venueId)
  if (!integration || integration.status === 'disconnected') {
    throw badRequest('Google Calendar is not connected for this venue')
  }

  const calendars = await listVenueCalendars(args.venueId)
  const selected = calendars.find((calendar) => calendar.id === args.calendarId)
  if (!selected) {
    throw badRequest('Selected Google calendar was not found in the connected account')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('venue_calendar_integrations')
    .upsert(
      {
        venue_id: args.venueId,
        provider: 'google_calendar',
        google_calendar_id: selected.id,
        google_calendar_name: args.calendarName?.trim() || selected.summary,
        status: 'connected',
        sync_enabled: true,
        sync_interval_minutes: getSyncIntervalMinutes(integration.sync_interval_minutes),
        sync_cursor: null,
        next_sync_at: new Date().toISOString(),
        last_error: null,
        updated_by: args.userId,
      },
      { onConflict: 'venue_id' }
    )

  if (error) {
    throw new Error(`Failed to select Google calendar for venue: ${error.message}`)
  }
}

async function applyCalendarBlockMutations(args: {
  venueId: string
  calendarId: string
  events: GoogleCalendarEventInput[]
  usedFullSync: boolean
}): Promise<{ upsertedCount: number; cancelledCount: number }> {
  const adminClient = createAdminClient()
  const mutations = buildCalendarBlockMutations(args.events, {
    venueId: args.venueId,
    source: 'google_calendar',
    calendarId: args.calendarId,
    timeZone: DEFAULT_TIME_ZONE,
  })

  let upsertedCount = 0
  if (mutations.upserts.length > 0) {
    const { error: upsertError } = await adminClient
      .from('external_availability_blocks')
      .upsert(mutations.upserts, { onConflict: 'venue_id,source,source_event_id' })

    if (upsertError) {
      throw new Error(`Failed to upsert external availability blocks: ${upsertError.message}`)
    }
    upsertedCount = mutations.upserts.length
  }

  const cancelledIds = new Set<string>(mutations.cancelledSourceEventIds)
  if (args.usedFullSync) {
    const activeIds = new Set<string>(mutations.upserts.map((row) => row.source_event_id))
    const { data: activeRows, error: activeRowsError } = await adminClient
      .from('external_availability_blocks')
      .select('source_event_id')
      .eq('venue_id', args.venueId)
      .eq('source', 'google_calendar')
      .eq('status', 'active')

    if (activeRowsError) {
      throw new Error(`Failed to load active external blocks for full sync: ${activeRowsError.message}`)
    }

    for (const row of (activeRows || []) as Array<{ source_event_id: string | null }>) {
      if (!row.source_event_id) {
        continue
      }
      if (!activeIds.has(row.source_event_id)) {
        cancelledIds.add(row.source_event_id)
      }
    }
  }

  const cancelledSourceEventIds = Array.from(cancelledIds)
  if (cancelledSourceEventIds.length === 0) {
    return {
      upsertedCount,
      cancelledCount: 0,
    }
  }

  const { error: cancelError } = await adminClient
    .from('external_availability_blocks')
    .update({
      status: 'cancelled',
      metadata: {
        cancelled_by_sync: true,
      },
    })
    .eq('venue_id', args.venueId)
    .eq('source', 'google_calendar')
    .in('source_event_id', cancelledSourceEventIds)
    .eq('status', 'active')

  if (cancelError) {
    throw new Error(`Failed to cancel stale external availability blocks: ${cancelError.message}`)
  }

  return {
    upsertedCount,
    cancelledCount: cancelledSourceEventIds.length,
  }
}

export async function syncVenueCalendarByVenueId(args: {
  venueId: string
  userId?: string | null
}): Promise<{
  venueId: string
  upsertedCount: number
  cancelledCount: number
  syncedAt: string
  nextSyncAt: string
}> {
  const adminClient = createAdminClient()
  const integration = await getIntegrationByVenueId(args.venueId)
  if (!integration) {
    throw badRequest('Google Calendar integration has not been configured for this venue')
  }
  if (integration.status === 'disconnected') {
    throw badRequest('Google Calendar integration is disconnected for this venue')
  }
  if (!integration.google_calendar_id) {
    throw badRequest('Select a Google calendar before syncing')
  }

  const syncIntervalMinutes = getSyncIntervalMinutes(integration.sync_interval_minutes)
  const syncedAt = new Date().toISOString()

  try {
    const { accessToken } = await getActiveAccessToken(args.venueId)
    const eventResult = await fetchGoogleEvents({
      accessToken,
      calendarId: integration.google_calendar_id,
      syncCursor: integration.sync_cursor,
    })
    const mutationResult = await applyCalendarBlockMutations({
      venueId: args.venueId,
      calendarId: integration.google_calendar_id,
      events: eventResult.events,
      usedFullSync: eventResult.usedFullSync,
    })
    const nextSyncAt = addMinutes(new Date(), syncIntervalMinutes)

    const { error: updateError } = await adminClient
      .from('venue_calendar_integrations')
      .update({
        status: 'connected',
        sync_enabled: true,
        sync_interval_minutes: syncIntervalMinutes,
        sync_cursor: eventResult.nextSyncToken || integration.sync_cursor,
        last_synced_at: syncedAt,
        next_sync_at: nextSyncAt,
        last_error: null,
        updated_by: args.userId || integration.updated_by,
      })
      .eq('venue_id', args.venueId)

    if (updateError) {
      throw new Error(`Failed to update calendar integration after sync: ${updateError.message}`)
    }

    return {
      venueId: args.venueId,
      upsertedCount: mutationResult.upsertedCount,
      cancelledCount: mutationResult.cancelledCount,
      syncedAt,
      nextSyncAt,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Google calendar sync error'
    const nextSyncAt = addMinutes(new Date(), syncIntervalMinutes)
    const { error: updateError } = await adminClient
      .from('venue_calendar_integrations')
      .update({
        status: 'error',
        sync_enabled: true,
        sync_interval_minutes: syncIntervalMinutes,
        next_sync_at: nextSyncAt,
        last_error: message,
        updated_by: args.userId || integration.updated_by,
      })
      .eq('venue_id', args.venueId)

    if (updateError) {
      throw new Error(`Google calendar sync failed: ${message}; and status update failed: ${updateError.message}`)
    }

    throw badRequest(message)
  }
}

export async function syncDueVenueCalendars(limit: number): Promise<Array<{
  venueId: string
  ok: boolean
  upsertedCount?: number
  cancelledCount?: number
  error?: string
}>> {
  const adminClient = createAdminClient()
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 25
  const now = new Date().toISOString()

  const { data, error } = await adminClient
    .from('venue_calendar_integrations')
    .select('venue_id')
    .eq('provider', 'google_calendar')
    .eq('sync_enabled', true)
    .in('status', ['connected', 'error'])
    .lte('next_sync_at', now)
    .order('next_sync_at', { ascending: true })
    .limit(normalizedLimit)

  if (error) {
    throw new Error(`Failed to load due venue calendar integrations: ${error.message}`)
  }

  const dueVenueIds = ((data || []) as Array<{ venue_id: string }>).map((row) => row.venue_id)
  const results: Array<{
    venueId: string
    ok: boolean
    upsertedCount?: number
    cancelledCount?: number
    error?: string
  }> = []

  for (const venueId of dueVenueIds) {
    try {
      const syncResult = await syncVenueCalendarByVenueId({ venueId })
      results.push({
        venueId,
        ok: true,
        upsertedCount: syncResult.upsertedCount,
        cancelledCount: syncResult.cancelledCount,
      })
    } catch (error) {
      results.push({
        venueId,
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown sync failure',
      })
    }
  }

  return results
}

export async function disconnectVenueCalendar(args: { venueId: string; userId: string }): Promise<void> {
  const adminClient = createAdminClient()
  const tokenRow = await getTokenByVenueId(args.venueId)

  if (tokenRow) {
    try {
      const refreshToken = decryptSecret(tokenRow.refresh_token_encrypted)
      await revokeRefreshToken(refreshToken)
    } catch {
      // Non-fatal for disconnect flow.
    }

    const { error: tokenDeleteError } = await adminClient
      .from('venue_calendar_tokens')
      .delete()
      .eq('venue_id', args.venueId)

    if (tokenDeleteError) {
      throw new Error(`Failed to remove venue calendar tokens: ${tokenDeleteError.message}`)
    }
  }

  const { error: integrationUpdateError } = await adminClient
    .from('venue_calendar_integrations')
    .upsert(
      {
        venue_id: args.venueId,
        provider: 'google_calendar',
        google_calendar_id: null,
        google_calendar_name: null,
        status: 'disconnected',
        sync_enabled: false,
        sync_cursor: null,
        next_sync_at: null,
        last_synced_at: null,
        last_error: null,
        updated_by: args.userId,
      },
      { onConflict: 'venue_id' }
    )

  if (integrationUpdateError) {
    throw new Error(`Failed to update venue calendar integration: ${integrationUpdateError.message}`)
  }

  const { error: blockUpdateError } = await adminClient
    .from('external_availability_blocks')
    .update({
      status: 'cancelled',
      metadata: {
        cancelled_by_disconnect: true,
      },
    })
    .eq('venue_id', args.venueId)
    .eq('source', 'google_calendar')
    .eq('status', 'active')

  if (blockUpdateError) {
    throw new Error(`Failed to clear active Google calendar blocks: ${blockUpdateError.message}`)
  }
}

export async function getVenueCalendarStatus(venueId: string, includeCalendars = false): Promise<{
  integration: VenueCalendarIntegrationRow | null
  calendars: Array<{ id: string; summary: string; primary: boolean }>
}> {
  const integration = await getIntegrationByVenueId(venueId)
  if (!integration) {
    return {
      integration: null,
      calendars: [],
    }
  }

  if (!includeCalendars || integration.status === 'disconnected') {
    return {
      integration,
      calendars: [],
    }
  }

  const token = await getTokenByVenueId(venueId)
  if (!token) {
    return {
      integration,
      calendars: [],
    }
  }

  try {
    const calendars = await listVenueCalendars(venueId)
    return {
      integration,
      calendars,
    }
  } catch {
    return {
      integration,
      calendars: [],
    }
  }
}

export async function assertVenueExists(venueId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venues')
    .select('id')
    .eq('id', venueId)
    .single()

  if (error || !data) {
    throw notFound('Venue not found')
  }
}

export async function assertVenueHasOperatingHours(venueId: string): Promise<void> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venue_admin_configs')
    .select('operating_hours')
    .eq('venue_id', venueId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load venue operating hours: ${error.message}`)
  }

  const operatingHours = Array.isArray((data as { operating_hours?: unknown[] } | null)?.operating_hours)
    ? ((data as { operating_hours: unknown[] }).operating_hours || [])
    : []

  if (operatingHours.length === 0) {
    throw badRequest('Define operating hours before connecting Google Calendar')
  }
}
