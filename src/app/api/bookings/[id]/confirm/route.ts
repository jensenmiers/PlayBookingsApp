/**
 * Confirm Booking API Route
 * POST /api/bookings/:id/confirm - Confirm booking (venue owner action)
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireBookingAccess } from '@/middleware/rbacMiddleware'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import type { Booking } from '@/types'
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

    const bookingService = new BookingService()
    const booking = await bookingService.confirmBooking(id, auth.userId)

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
      message: 'Booking confirmed successfully',
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}



