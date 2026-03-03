import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import {
  completeCalendarOAuthConnection,
  getCalendarCallbackUrl,
  verifyCalendarOAuthState,
} from '@/services/googleCalendarIntegrationService'

type RouteContext = { params: Promise<{ id: string }> }
type CalendarCallbackErrorCode =
  | 'oauth_denied'
  | 'missing_code_state'
  | 'invalid_state'
  | 'oauth_exchange_failed'
  | 'callback_failed'

function getSuperAdminRedirectBase(origin: string): string {
  return `${origin}/dashboard/super-admin`
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
  venueId: string,
  code: CalendarCallbackErrorCode
): Response {
  return redirectWithParams(origin, {
    venue_id: venueId,
    calendar_error_code: code,
  })
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

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id: venueId } = await context.params
    if (!venueId) {
      return redirectWithParams(request.nextUrl.origin, {
        calendar_error_code: 'callback_failed',
      })
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      return redirectWithErrorCode(
        request.nextUrl.origin,
        venueId,
        mapProviderErrorToCode()
      )
    }

    if (!code || !state) {
      return redirectWithErrorCode(request.nextUrl.origin, venueId, 'missing_code_state')
    }

    const stateValid = verifyCalendarOAuthState(state, venueId, auth.userId)
    if (!stateValid) {
      return redirectWithErrorCode(request.nextUrl.origin, venueId, 'invalid_state')
    }

    await completeCalendarOAuthConnection({
      venueId,
      userId: auth.userId,
      code,
      redirectUri: getCalendarCallbackUrl(request.nextUrl.origin, venueId),
    })

    return redirectWithParams(request.nextUrl.origin, {
      venue_id: venueId,
      calendar_connected: '1',
    })
  } catch (error) {
    // Keep callback user-friendly by returning to super-admin view with a safe error code.
    const { id: venueId } = await context.params
    if (!venueId) {
      return redirectWithParams(request.nextUrl.origin, {
        calendar_error_code: 'callback_failed',
      })
    }
    return redirectWithErrorCode(
      request.nextUrl.origin,
      venueId,
      mapCallbackFailureToCode(error)
    )
  }
}
