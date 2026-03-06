import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import {
  completeCalendarOAuthConnection,
  getCalendarCallbackUrl,
  markVenueCalendarOAuthStateUsed,
  resolveVenueCalendarOAuthState,
} from '@/services/googleCalendarIntegrationService'

type CalendarCallbackErrorCode =
  | 'oauth_denied'
  | 'missing_code_state'
  | 'invalid_state'
  | 'oauth_exchange_failed'
  | 'callback_failed'

function getSuperAdminRedirectBase(origin: string): string {
  return `${origin}/super-admin`
}

function redirectWithParams(origin: string, params: Record<string, string>): Response {
  const url = new URL(getSuperAdminRedirectBase(origin))
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return Response.redirect(url)
}

function redirectWithErrorCode(
  origin: string,
  venueId: string | null,
  code: CalendarCallbackErrorCode
): Response {
  const params: Record<string, string> = {
    calendar_error_code: code,
  }

  if (venueId) {
    params.venue_id = venueId
  }

  return redirectWithParams(origin, params)
}

function mapProviderErrorToCode(): CalendarCallbackErrorCode {
  return 'oauth_denied'
}

function mapCallbackFailureToCode(error: unknown): CalendarCallbackErrorCode {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (
    message.includes('oauth token exchange')
    || message.includes('token exchange')
    || message.includes('did not return access_token')
    || message.includes('did not return refresh_token')
  ) {
    return 'oauth_exchange_failed'
  }

  return 'callback_failed'
}

export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')
  let venueId: string | null = null

  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const resolvedState = state
      ? await resolveVenueCalendarOAuthState({
          state,
          userId: auth.userId,
        })
      : null
    venueId = resolvedState?.venueId || null

    if (oauthError) {
      return redirectWithErrorCode(
        request.nextUrl.origin,
        venueId,
        mapProviderErrorToCode()
      )
    }

    if (!code || !state) {
      return redirectWithErrorCode(
        request.nextUrl.origin,
        venueId,
        'missing_code_state'
      )
    }

    if (!resolvedState) {
      return redirectWithErrorCode(request.nextUrl.origin, venueId, 'invalid_state')
    }

    await completeCalendarOAuthConnection({
      venueId: resolvedState.venueId,
      userId: auth.userId,
      code,
      redirectUri: getCalendarCallbackUrl(request.nextUrl.origin),
    })
    await markVenueCalendarOAuthStateUsed(state)

    return redirectWithParams(request.nextUrl.origin, {
      venue_id: resolvedState.venueId,
      calendar_connected: '1',
    })
  } catch (error) {
    return redirectWithErrorCode(
      request.nextUrl.origin,
      venueId,
      mapCallbackFailureToCode(error)
    )
  }
}
