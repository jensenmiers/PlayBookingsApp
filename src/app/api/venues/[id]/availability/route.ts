/**
 * Venue Availability API Route
 * GET /api/venues/[id]/availability - Get true available slots for a venue
 * 
 * Returns availability slots filtered against existing bookings.
 * Slots that are already booked (or partially overlap with bookings) are excluded or split.
 */

import { NextRequest } from 'next/server'
import { AvailabilityService } from '@/services/availabilityService'
import { handleApiError, badRequest, notFound } from '@/utils/errorHandling'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types/api'
import type { ComputedSlot } from '@/utils/slotSplitting'

type RouteContext = { params: Promise<{ id: string }> }

export type GetAvailabilityResponse = ApiResponse<ComputedSlot[]>

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id: venueId } = await context.params
    const searchParams = request.nextUrl.searchParams
    
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Validate required parameters
    if (!dateFrom || !dateTo) {
      throw badRequest('date_from and date_to query parameters are required')
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
      throw badRequest('Dates must be in YYYY-MM-DD format')
    }

    // Validate date range
    if (dateFrom > dateTo) {
      throw badRequest('date_from must be before or equal to date_to')
    }

    // Verify venue exists
    const supabase = await createClient()
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id')
      .eq('id', venueId)
      .eq('is_active', true)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    // Get available slots
    const availabilityService = new AvailabilityService()
    const slots = await availabilityService.getAvailableSlots(venueId, dateFrom, dateTo)

    const response: GetAvailabilityResponse = {
      success: true,
      data: slots,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
