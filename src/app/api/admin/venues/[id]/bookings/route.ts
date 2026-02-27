import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest, handleApiError } from '@/utils/errorHandling'
import type { ApiResponse, AdminVenueBookingFeedItem, AdminVenueBookingRenterSummary } from '@/types/api'

type RouteContext = { params: Promise<{ id: string }> }
type BookingRow = Omit<AdminVenueBookingFeedItem, 'renter'>

type UserRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id } = await context.params
    if (!id) {
      throw badRequest('Venue id is required')
    }

    const adminClient = createAdminClient()
    const { data: bookingRows, error: bookingsError } = await adminClient
      .from('bookings')
      .select('*')
      .eq('venue_id', id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    const bookings = (bookingRows || []) as BookingRow[]
    const renterIds = Array.from(new Set(bookings.map((booking) => booking.renter_id)))

    const renterById = new Map<string, AdminVenueBookingRenterSummary>()
    if (renterIds.length > 0) {
      const { data: userRows, error: usersError } = await adminClient
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', renterIds)

      if (usersError) {
        throw new Error(`Failed to fetch renters: ${usersError.message}`)
      }

      for (const row of (userRows || []) as UserRow[]) {
        renterById.set(row.id, {
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
        })
      }
    }

    const data: AdminVenueBookingFeedItem[] = bookings.map((booking) => ({
      ...booking,
      renter: renterById.get(booking.renter_id) || null,
    }))

    const response: ApiResponse<AdminVenueBookingFeedItem[]> = {
      success: true,
      data,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
