import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { badRequest, handleApiError } from '@/utils/errorHandling'
import { assertVenueExists, disconnectVenueCalendar } from '@/services/googleCalendarIntegrationService'
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

    await disconnectVenueCalendar({
      venueId,
      userId: auth.userId,
    })

    const response: ApiResponse<{ disconnected: true }> = {
      success: true,
      data: { disconnected: true },
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
