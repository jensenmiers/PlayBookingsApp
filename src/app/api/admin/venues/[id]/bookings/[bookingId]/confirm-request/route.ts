import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { getPostHogClient } from '@/lib/posthog-server'
import { BookingRequestService, type BookingRequestDecisionResult } from '@/services/bookingRequestService'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string; bookingId: string }> }

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)
    const { id: venueId, bookingId } = await context.params

    const result = await new BookingRequestService().confirm({
      venueId,
      bookingId,
      adminUserId: auth.userId,
    })

    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: auth.userId,
        event: 'booking_request_confirmed',
        properties: { venue_id: venueId, booking_id: bookingId },
      })
      await posthog.flush()
    } catch (error) {
      console.error('Failed to capture booking_request_confirmed', error)
    }

    const response: ApiResponse<BookingRequestDecisionResult> = {
      success: true,
      data: result,
      message: result.emailSent ? 'Request confirmed' : 'Request confirmed, but the email was not sent',
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

