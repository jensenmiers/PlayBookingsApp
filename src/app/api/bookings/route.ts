/**
 * Bookings API Routes
 * GET /api/bookings - List bookings
 * POST /api/bookings - Create booking
 */

import { NextRequest } from 'next/server'
import { BookingService } from '@/services/bookingService'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireRenterOrOwner } from '@/middleware/rbacMiddleware'
import { validateRequest, validateQuery } from '@/middleware/validationMiddleware'
import { createBookingSchema, bookingQuerySchema } from '@/lib/validations/booking'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse, PaginatedResponse, ListBookingsResponse } from '@/types/api'
import type { Booking } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    requireRenterOrOwner(auth)

    const query = validateQuery(request, bookingQuerySchema)
    const filters = {
      status: query.status,
      venue_id: query.venue_id,
      date_from: query.date_from,
      date_to: query.date_to,
    }

    const bookingService = new BookingService()
    const bookings = await bookingService.listBookings(filters, auth.userId)

    // Simple pagination (could be enhanced)
    const page = query.page || 1
    const limit = query.limit || 20
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedBookings = bookings.slice(start, end)

    const response: ListBookingsResponse = {
      success: true,
      data: paginatedBookings,
      pagination: {
        page,
        limit,
        total: bookings.length,
        total_pages: Math.ceil(bookings.length / limit),
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    requireRenterOrOwner(auth)

    const body = await validateRequest(request, createBookingSchema)

    const bookingService = new BookingService()
    const booking = await bookingService.createBooking(body, auth.userId)

    const response: ApiResponse<Booking> = {
      success: true,
      data: booking,
      message: 'Booking created successfully',
    }

    return Response.json(response, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}


