/**
 * Cancel Booking API Route
 * POST /api/bookings/:id/cancel - Cancel booking with 48-hour policy validation
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireBookingAccess } from '@/middleware/rbacMiddleware'
import { validateRequest } from '@/middleware/validationMiddleware'
import { cancelBookingSchema } from '@/lib/validations/booking'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import type { Booking } from '@/types'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    const supabase = createClient()

    await requireBookingAccess(supabase, params.id, auth)

    await validateRequest(request, cancelBookingSchema)

    const bookingService = new BookingService()
    const booking = await bookingService.cancelBooking(params.id, auth.userId)

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
      message: 'Booking cancelled successfully',
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}


