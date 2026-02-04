/**
 * Cancel Booking API Route
 * POST /api/bookings/:id/cancel - Cancel booking with 48-hour policy validation and refund
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireBookingAccess } from '@/middleware/rbacMiddleware'
import { validateRequest } from '@/middleware/validationMiddleware'
import { cancelBookingSchema } from '@/lib/validations/booking'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import type { CancellationResult } from '@/types'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const auth = await requireAuth()
    const supabase = await createClient()

    await requireBookingAccess(supabase, id, auth)

    await validateRequest(request, cancelBookingSchema)

    const bookingService = new BookingService()
    const result = await bookingService.cancelBooking(id, auth.userId)

    let message = 'Booking cancelled successfully'
    if (result.refundIssued) {
      message = `Booking cancelled successfully. Refund of $${result.refundAmount?.toFixed(2)} has been processed.`
    }

    const response: ApiResponse<CancellationResult> = {
      success: true,
      data: result,
      message,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}



