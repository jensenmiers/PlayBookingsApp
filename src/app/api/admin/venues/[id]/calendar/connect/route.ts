import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { handleApiError, badRequest } from '@/utils/errorHandling'
import { assertVenueExists, assertVenueHasOperatingHours, buildGoogleCalendarAuthUrl } from '@/services/googleCalendarIntegrationService'
import type { ApiResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)
    const { id: venueId } = await context.params
    if (!venueId) {
      throw badRequest('Venue id is required')
    }

    await assertVenueExists(venueId)
    await assertVenueHasOperatingHours(venueId)

    const authUrl = buildGoogleCalendarAuthUrl({
      origin: _request.nextUrl.origin,
      venueId,
      userId: auth.userId,
    })

    const response: ApiResponse<{ auth_url: string }> = {
      success: true,
      data: {
        auth_url: authUrl,
      },
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
