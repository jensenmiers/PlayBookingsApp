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
import { getPostHogClient } from '@/lib/posthog-server'

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

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: auth.userId,
      event: 'booking_confirmed',
      properties: {
        booking_id: booking.id,
        venue_id: booking.venue_id,
        booking_date: booking.date,
        total_amount: booking.total_amount,
      },
    })
    await posthog.flush()

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



