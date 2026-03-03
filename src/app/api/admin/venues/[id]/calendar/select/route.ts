import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { validateRequest } from '@/middleware/validationMiddleware'
import { badRequest, handleApiError } from '@/utils/errorHandling'
import { assertVenueExists, selectVenueCalendar } from '@/services/googleCalendarIntegrationService'
import type { ApiResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string }> }

const selectVenueCalendarSchema = z.object({
  calendar_id: z.string().min(1, 'calendar_id is required'),
  calendar_name: z.string().min(1).nullable().optional(),
})

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)
    const { id: venueId } = await context.params
    if (!venueId) {
      throw badRequest('Venue id is required')
    }
    await assertVenueExists(venueId)

    const body = await validateRequest(request, selectVenueCalendarSchema)
    await selectVenueCalendar({
      venueId,
      userId: auth.userId,
      calendarId: body.calendar_id,
      calendarName: body.calendar_name ?? null,
    })

    const response: ApiResponse<{ selected: true }> = {
      success: true,
      data: { selected: true },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
