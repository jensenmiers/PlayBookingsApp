import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { badRequest } from '@/utils/errorHandling'
import {
  completeCalendarOAuthConnection,
  getCalendarCallbackUrl,
  verifyCalendarOAuthState,
} from '@/services/googleCalendarIntegrationService'

type RouteContext = { params: Promise<{ id: string }> }

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

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id: venueId } = await context.params
    if (!venueId) {
      throw badRequest('Venue id is required')
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      return redirectWithParams(request.nextUrl.origin, {
        venue_id: venueId,
        calendar_error: oauthError,
      })
    }

    if (!code || !state) {
      throw badRequest('Missing code or state query parameter for Google callback')
    }

    const stateValid = verifyCalendarOAuthState(state, venueId, auth.userId)
    if (!stateValid) {
      throw badRequest('Invalid or expired calendar OAuth state')
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
    // Keep callback user-friendly by returning to super-admin view with an error marker.
    const { id: venueId } = await context.params
    const message = error instanceof Error ? error.message : 'calendar_callback_failed'
    return redirectWithParams(request.nextUrl.origin, {
      venue_id: venueId,
      calendar_error: message,
    })
  }
}
