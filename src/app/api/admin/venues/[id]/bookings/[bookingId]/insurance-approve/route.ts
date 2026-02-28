import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest, handleApiError, notFound } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import type { Booking } from '@/types'

type RouteContext = { params: Promise<{ id: string; bookingId: string }> }

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id: venueId, bookingId } = await context.params
    if (!venueId || !bookingId) {
      throw badRequest('Venue id and booking id are required')
    }

    const adminClient = createAdminClient()
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      throw notFound('Booking not found')
    }

    if (booking.venue_id !== venueId) {
      throw badRequest('Booking does not belong to this venue')
    }

    if (booking.status !== 'pending') {
      throw badRequest('Only pending bookings can be insurance-approved')
    }

    if (!booking.insurance_required) {
      throw badRequest('Booking does not require insurance approval')
    }

    if (booking.insurance_approved) {
      const response: ApiResponse<Booking> = {
        success: true,
        data: booking as Booking,
        message: 'Insurance already approved',
      }
      return Response.json(response)
    }

    const { data: updatedBooking, error: updateError } = await adminClient
      .from('bookings')
      .update({ insurance_approved: true })
      .eq('id', bookingId)
      .select('*')
      .single()

    if (updateError || !updatedBooking) {
      throw new Error(`Failed to approve booking insurance: ${updateError?.message || 'Unknown error'}`)
    }

    const { error: auditError } = await adminClient
      .from('audit_logs')
      .insert({
        table_name: 'bookings',
        record_id: bookingId,
        action: 'insurance_approved',
        old_values: booking,
        new_values: updatedBooking,
        user_id: auth.userId,
      })

    if (auditError) {
      throw new Error(`Failed to write insurance approval audit log: ${auditError.message}`)
    }

    const response: ApiResponse<Booking> = {
      success: true,
      data: updatedBooking as Booking,
      message: 'Insurance approved',
    }
    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
