import * as z from 'zod'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { getPostHogClient } from '@/lib/posthog-server'
import { BookingRequestService, type BookingRequestDecisionResult } from '@/services/bookingRequestService'
import { badRequest, handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

type RouteContext = { params: Promise<{ id: string; bookingId: string }> }

const declineSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)
    const { id: venueId, bookingId } = await context.params

    const rawBody = await request.text()
    let body: unknown = {}
    if (rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch {
        throw badRequest('Invalid request body')
      }
    }
    const parsed = declineSchema.safeParse(body)
    if (!parsed.success) {
      throw badRequest('Reason must be 500 characters or fewer')
    }

    const result = await new BookingRequestService().decline({
      venueId,
      bookingId,
      adminUserId: auth.userId,
      reason: parsed.data.reason,
    })

    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: auth.userId,
        event: 'booking_request_declined',
        properties: { venue_id: venueId, booking_id: bookingId },
      })
      await posthog.flush()
    } catch (error) {
      console.error('Failed to capture booking_request_declined', error)
    }

    const response: ApiResponse<BookingRequestDecisionResult> = {
      success: true,
      data: result,
      message: result.emailSent ? 'Request declined' : 'Request declined, but the email was not sent',
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
