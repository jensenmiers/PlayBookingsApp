/**
 * Booking by ID API Routes
 * GET /api/bookings/:id - Get booking
 * PATCH /api/bookings/:id - Update booking
 * DELETE /api/bookings/:id - Delete booking (soft delete)
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireBookingAccess } from '@/middleware/rbacMiddleware'
import { validateRequest } from '@/middleware/validationMiddleware'
import { updateBookingSchema } from '@/lib/validations/booking'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import type { Booking } from '@/types'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    const supabase = createClient()

    await requireBookingAccess(supabase, params.id, auth)

    const bookingService = new BookingService()
    const booking = await bookingService.getBooking(params.id, auth.userId)

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    const supabase = createClient()

    await requireBookingAccess(supabase, params.id, auth)

    const body = await validateRequest(request, updateBookingSchema)

    const bookingService = new BookingService()
    const booking = await bookingService.updateBooking(params.id, body, auth.userId)

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    const supabase = createClient()

    await requireBookingAccess(supabase, params.id, auth)

    const bookingService = new BookingService()
    // Soft delete by cancelling
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



