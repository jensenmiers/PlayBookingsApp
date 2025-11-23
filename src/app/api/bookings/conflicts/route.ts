/**
 * Check Conflicts API Route
 * POST /api/bookings/conflicts - Check for booking conflicts before creation
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { validateRequest } from '@/middleware/validationMiddleware'
import { checkConflictsSchema } from '@/lib/validations/booking'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse, CheckConflictsResponse } from '@/types/api'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await validateRequest(request, checkConflictsSchema)

    const bookingService = new BookingService()
    const conflictResult = await bookingService.checkConflicts(
      body.venue_id,
      body.date,
      body.start_time,
      body.end_time,
      body.exclude_booking_id
    )

    const response: CheckConflictsResponse = {
      success: true,
      data: conflictResult,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}


