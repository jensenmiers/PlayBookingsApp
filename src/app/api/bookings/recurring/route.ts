/**
 * Generate Recurring Bookings API Route
 * POST /api/bookings/recurring - Generate recurring bookings from parent booking
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireBookingAccess } from '@/middleware/rbacMiddleware'
import { validateRequest } from '@/middleware/validationMiddleware'
import { generateRecurringSchema } from '@/lib/validations/booking'
import { handleApiError, notFound } from '@/utils/errorHandling'
import type { GenerateRecurringResponse } from '@/types/api'
import { createClient } from '@/lib/supabase/server'
import { BookingRepository } from '@/repositories/bookingRepository'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const supabase = await createClient()

    const body = await validateRequest(request, generateRecurringSchema)

    // Verify user has access to parent booking
    await requireBookingAccess(supabase, body.parent_booking_id, auth)

    // Get parent booking
    const bookingRepo = new BookingRepository()
    const parentBooking = await bookingRepo.findById(body.parent_booking_id)

    if (!parentBooking) {
      throw notFound('Parent booking not found')
    }

    // Update parent booking with recurring info if needed
    if (parentBooking.recurring_type !== body.recurring_type) {
      await bookingRepo.update(body.parent_booking_id, {
        recurring_type: body.recurring_type,
        recurring_end_date: body.end_date,
      })
    }

    const bookingService = new BookingService()
    const recurringBookings = await bookingService.generateRecurringBookings({
      ...parentBooking,
      recurring_type: body.recurring_type,
      recurring_end_date: body.end_date,
    })

    const response: GenerateRecurringResponse = {
      success: true,
      data: recurringBookings,
      message: `Generated ${recurringBookings.length} recurring bookings`,
    }

    return Response.json(response, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}



