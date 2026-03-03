/**
 * @jest-environment node
 */

export {}

import { NextRequest } from 'next/server'

const mockRequireAuth = jest.fn()
const mockRequireSuperAdmin = jest.fn()
const mockAssertVenueExists = jest.fn()
const mockAssertVenueHasOperatingHours = jest.fn()
const mockBuildGoogleCalendarAuthUrl = jest.fn()
const mockGetVenueCalendarStatus = jest.fn()
const mockSyncVenueCalendarByVenueId = jest.fn()
const mockDisconnectVenueCalendar = jest.fn()
const mockSelectVenueCalendar = jest.fn()
const mockCompleteCalendarOAuthConnection = jest.fn()
const mockGetCalendarCallbackUrl = jest.fn()
const mockVerifyCalendarOAuthState = jest.fn()

jest.mock('@/middleware/authMiddleware', () => ({
  requireAuth: () => mockRequireAuth(),
}))

jest.mock('@/lib/superAdmin', () => ({
  requireSuperAdmin: (...args: unknown[]) => mockRequireSuperAdmin(...args),
}))

jest.mock('@/services/googleCalendarIntegrationService', () => ({
  assertVenueExists: (...args: unknown[]) => mockAssertVenueExists(...args),
  assertVenueHasOperatingHours: (...args: unknown[]) => mockAssertVenueHasOperatingHours(...args),
  buildGoogleCalendarAuthUrl: (...args: unknown[]) => mockBuildGoogleCalendarAuthUrl(...args),
  getVenueCalendarStatus: (...args: unknown[]) => mockGetVenueCalendarStatus(...args),
  syncVenueCalendarByVenueId: (...args: unknown[]) => mockSyncVenueCalendarByVenueId(...args),
  disconnectVenueCalendar: (...args: unknown[]) => mockDisconnectVenueCalendar(...args),
  selectVenueCalendar: (...args: unknown[]) => mockSelectVenueCalendar(...args),
  completeCalendarOAuthConnection: (...args: unknown[]) => mockCompleteCalendarOAuthConnection(...args),
  getCalendarCallbackUrl: (...args: unknown[]) => mockGetCalendarCallbackUrl(...args),
  verifyCalendarOAuthState: (...args: unknown[]) => mockVerifyCalendarOAuthState(...args),
}))

type RouteContext = { params: Promise<{ id: string }> }

function createContext(id: string): RouteContext {
  return {
    params: Promise.resolve({ id }),
  }
}

describe('Admin venue calendar routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue({
      userId: 'super-admin-1',
      user: { id: 'super-admin-1', email: 'admin@example.com' },
    })
    mockRequireSuperAdmin.mockReturnValue(undefined)
    mockAssertVenueExists.mockResolvedValue(undefined)
    mockAssertVenueHasOperatingHours.mockResolvedValue(undefined)
    mockCompleteCalendarOAuthConnection.mockResolvedValue(undefined)
    mockGetCalendarCallbackUrl.mockReturnValue('http://localhost/api/admin/venues/venue-1/calendar/callback')
    mockVerifyCalendarOAuthState.mockReturnValue(true)
  })

  it('POST /connect returns auth url', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/connect/route')
    mockBuildGoogleCalendarAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?x=1')

    const response = await route.POST(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/connect', { method: 'POST' }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.data.auth_url).toContain('accounts.google.com')
    expect(mockBuildGoogleCalendarAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: 'venue-1',
        userId: 'super-admin-1',
      })
    )
  })

  it('GET /status returns status payload and forwards include_calendars', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/status/route')
    mockGetVenueCalendarStatus.mockResolvedValue({
      integration: null,
      calendars: [{ id: 'primary', summary: 'Primary', primary: true }],
    })

    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/status?include_calendars=1'),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(mockGetVenueCalendarStatus).toHaveBeenCalledWith('venue-1', true)
  })

  it('POST /sync calls sync service with venue and user ids', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/sync/route')
    mockSyncVenueCalendarByVenueId.mockResolvedValue({
      venueId: 'venue-1',
      upsertedCount: 2,
      cancelledCount: 1,
      syncedAt: '2026-03-03T00:00:00.000Z',
      nextSyncAt: '2026-03-03T00:05:00.000Z',
    })

    const response = await route.POST(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/sync', { method: 'POST' }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(mockSyncVenueCalendarByVenueId).toHaveBeenCalledWith({
      venueId: 'venue-1',
      userId: 'super-admin-1',
    })
  })

  it('POST /disconnect calls disconnect service', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/disconnect/route')
    mockDisconnectVenueCalendar.mockResolvedValue(undefined)

    const response = await route.POST(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/disconnect', { method: 'POST' }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(mockDisconnectVenueCalendar).toHaveBeenCalledWith({
      venueId: 'venue-1',
      userId: 'super-admin-1',
    })
  })

  it('POST /select validates payload and calls select service', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/select/route')
    mockSelectVenueCalendar.mockResolvedValue(undefined)

    const response = await route.POST(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/select', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ calendar_id: 'primary', calendar_name: 'Primary' }),
      }),
      createContext('venue-1')
    )

    expect(response.status).toBe(200)
    expect(mockSelectVenueCalendar).toHaveBeenCalledWith({
      venueId: 'venue-1',
      userId: 'super-admin-1',
      calendarId: 'primary',
      calendarName: 'Primary',
    })
  })

  it('GET /callback returns safe code for missing code/state params', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/callback/route')

    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/callback'),
      createContext('venue-1')
    )

    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''
    expect(location).toContain('venue_id=venue-1')
    expect(location).toContain('calendar_error_code=missing_code_state')
  })

  it('GET /callback returns safe code for invalid OAuth state', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/callback/route')
    mockVerifyCalendarOAuthState.mockReturnValue(false)

    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/callback?code=test-code&state=test-state'),
      createContext('venue-1')
    )

    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''
    expect(location).toContain('calendar_error_code=invalid_state')
    expect(mockCompleteCalendarOAuthConnection).not.toHaveBeenCalled()
  })

  it('GET /callback maps provider access_denied to oauth_denied', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/callback/route')

    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/callback?error=access_denied'),
      createContext('venue-1')
    )

    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''
    expect(location).toContain('calendar_error_code=oauth_denied')
    expect(location).not.toContain('calendar_error=')
  })

  it('GET /callback returns generic safe code for internal callback failures', async () => {
    const route = await import('@/app/api/admin/venues/[id]/calendar/callback/route')
    mockCompleteCalendarOAuthConnection.mockRejectedValue(new Error('unexpected provider payload'))

    const response = await route.GET(
      new NextRequest('http://localhost/api/admin/venues/venue-1/calendar/callback?code=test-code&state=test-state'),
      createContext('venue-1')
    )

    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''
    expect(location).toContain('calendar_error_code=callback_failed')
    expect(location).not.toContain('provider')
    expect(location).not.toContain('calendar_error=')
  })
})
