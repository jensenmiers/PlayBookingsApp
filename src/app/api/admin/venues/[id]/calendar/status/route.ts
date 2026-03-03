import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { badRequest, handleApiError } from '@/utils/errorHandling'
import { assertVenueExists, getVenueCalendarStatus } from '@/services/googleCalendarIntegrationService'
import type { ApiResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)
    const { id: venueId } = await context.params
    if (!venueId) {
      throw badRequest('Venue id is required')
    }
    await assertVenueExists(venueId)

    const includeCalendars = request.nextUrl.searchParams.get('include_calendars') === '1'
    const status = await getVenueCalendarStatus(venueId, includeCalendars)

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
