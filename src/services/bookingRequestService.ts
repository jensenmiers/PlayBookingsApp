import { createAdminClient } from '@/lib/supabase/admin'
import { resolveVenueBookingMode } from '@/lib/booking-mode'
import { badRequest, conflict, notFound } from '@/utils/errorHandling'
import type { Booking } from '@/types'
import { BookingConfirmationEmailService } from './bookingConfirmationEmailService'
import { BookingRequestEmailService } from './bookingRequestEmailService'

/**
 * Super-admin answers to request-to-book requests, which are confirmed offline.
 * Confirm sets the booking to `confirmed`; decline sets it to `cancelled` and keeps
 * the reason in audit_logs. Bookings at venues that take payment are refused so the
 * payment flow can never be skipped.
 */

type Decision = 'confirm' | 'decline'

interface DecisionInput {
  venueId: string
  bookingId: string
  adminUserId: string
}

export interface BookingRequestDecisionResult {
  booking: Booking
  emailSent: boolean
}

interface BookingRequestServiceDependencies {
  adminClient?: () => ReturnType<typeof createAdminClient>
  confirmationEmail?: Pick<BookingConfirmationEmailService, 'sendIfNeeded'>
  requestEmail?: Pick<BookingRequestEmailService, 'sendDeclined'>
}

export class BookingRequestService {
  private readonly adminClient: () => ReturnType<typeof createAdminClient>
  private readonly confirmationEmail: Pick<BookingConfirmationEmailService, 'sendIfNeeded'>
  private readonly requestEmail: Pick<BookingRequestEmailService, 'sendDeclined'>

  constructor(dependencies: BookingRequestServiceDependencies = {}) {
    this.adminClient = dependencies.adminClient || createAdminClient
    this.confirmationEmail = dependencies.confirmationEmail || new BookingConfirmationEmailService()
    this.requestEmail = dependencies.requestEmail || new BookingRequestEmailService()
  }

  confirm(input: DecisionInput): Promise<BookingRequestDecisionResult> {
    return this.decide('confirm', input)
  }

  decline(input: DecisionInput & { reason?: string | null }): Promise<BookingRequestDecisionResult> {
    return this.decide('decline', input, input.reason?.trim() || null)
  }

  private async decide(
    decision: Decision,
    { venueId, bookingId, adminUserId }: DecisionInput,
    reason: string | null = null
  ): Promise<BookingRequestDecisionResult> {
    const supabase = this.adminClient()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()
    if (bookingError) {
      throw new Error(`Failed to load booking: ${bookingError.message}`)
    }
    if (!booking) {
      throw notFound('Booking not found')
    }
    if (booking.venue_id !== venueId) {
      throw badRequest('Booking does not belong to this venue')
    }
    if (booking.status !== 'pending') {
      throw badRequest('Only pending requests can be confirmed or declined')
    }

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('booking_mode, instant_booking')
      .eq('id', venueId)
      .maybeSingle()
    if (venueError) {
      throw new Error(`Failed to load venue: ${venueError.message}`)
    }
    if (!venue || resolveVenueBookingMode(venue) !== 'request_to_book') {
      throw badRequest('Only request-to-book venues can be confirmed here')
    }

    const nextStatus = decision === 'confirm' ? 'confirmed' : 'cancelled'
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle()
    if (updateError) {
      throw new Error(`Failed to update booking: ${updateError.message}`)
    }
    if (!updated) {
      throw conflict('This request was already answered')
    }

    // audit_logs.action only allows create/update/delete, so the decision itself goes in new_values.
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'bookings',
        record_id: bookingId,
        action: 'update',
        old_values: booking,
        new_values: {
          ...updated,
          request_decision: decision === 'confirm' ? 'confirmed' : 'declined',
          ...(decision === 'decline' ? { decline_reason: reason } : {}),
        },
        user_id: adminUserId,
      })
    if (auditError) {
      // The decision is already saved; a missing log line must not stop the renter's email.
      console.error('Failed to write booking request audit log', auditError)
    }

    let emailSent = true
    try {
      if (decision === 'confirm') {
        await this.confirmationEmail.sendIfNeeded(bookingId)
      } else {
        await this.requestEmail.sendDeclined(bookingId, reason)
      }
    } catch (error) {
      // The decision stands; the admin sees "email not sent" and can follow up by hand.
      emailSent = false
      console.error(`Booking request ${decision} email failed`, error)
    }

    return { booking: updated as Booking, emailSent }
  }
}
