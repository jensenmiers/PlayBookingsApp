/**
 * Booking service with business logic extracted from database triggers
 */

import { BookingRepository } from '@/repositories/bookingRepository'
import { AuditService } from './auditService'
import { PaymentService } from './paymentService'
import { calculateRecurringDates } from '@/utils/recurringGenerator'
import { getCancellationInfo, calculateDuration, isPastBookingStart } from '@/utils/dateHelpers'
import { conflict, badRequest, notFound } from '@/utils/errorHandling'
import { getBookingPolicyViolation, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { Booking, RecurringBooking, CreateBookingForm, BookingStatus, BookingWithPaymentInfo, CancellationResult, BookingWithVenue } from '@/types'
import { createClient } from '@/lib/supabase/server'

type BookingConflictResult = {
  hasConflict: boolean
  conflictType?: 'time_overlap' | 'slot_unavailable' | 'advance_booking_exceeded'
  conflictingBookingId?: string
  message?: string
}

type ExternalAvailabilityBlockRow = {
  id: string
  venue_id: string
  source: string
  source_event_id: string | null
  start_at: string
  end_at: string
  status: 'active' | 'cancelled'
}

function overlapsExternalBlock(
  date: string,
  startTime: string,
  endTime: string,
  block: ExternalAvailabilityBlockRow
): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  const slotStart = new Date(year, month - 1, day, startHour, startMinute || 0, 0, 0).getTime()
  const slotEnd = new Date(year, month - 1, day, endHour, endMinute || 0, 0, 0).getTime()
  const blockStart = new Date(block.start_at).getTime()
  const blockEnd = new Date(block.end_at).getTime()

  return slotStart < blockEnd && slotEnd > blockStart
}

export class BookingService {
  private bookingRepo = new BookingRepository()
  private auditService = new AuditService()
  private paymentService = new PaymentService()

  /**
   * Create a new booking with full validation
   * Returns booking with payment flow flags
   */
  async createBooking(data: CreateBookingForm, userId: string): Promise<BookingWithPaymentInfo> {
    const supabase = await createClient()
    // Get venue to check advance booking window and calculate amount
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', data.venue_id)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    const adminConfigQuery = supabase
      .from('venue_admin_configs')
      .select('*')
      .eq('venue_id', data.venue_id)
    const maybeSingle = (
      adminConfigQuery as {
        maybeSingle?: () => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>
      }
    ).maybeSingle
    const { data: adminConfigRow, error: adminConfigError } = maybeSingle
      ? await maybeSingle.call(adminConfigQuery)
      : { data: null, error: null }

    const isMissingConfigTable = adminConfigError?.code === '42P01'
      || adminConfigError?.message?.toLowerCase().includes('venue_admin_configs')
    if (adminConfigError && !isMissingConfigTable) {
      throw badRequest(`Failed to load venue booking policy: ${adminConfigError.message}`)
    }

    const adminConfig = normalizeVenueAdminConfig(data.venue_id, isMissingConfigTable ? null : (adminConfigRow || null))
    const policyViolation = getBookingPolicyViolation(
      {
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
      },
      adminConfig
    )
    if (policyViolation) {
      throw badRequest(policyViolation.message)
    }

    // Check conflicts
    const conflictResult = await this.checkConflicts(
      data.venue_id,
      data.date,
      data.start_time,
      data.end_time
    )

    if (conflictResult.hasConflict) {
      throw conflict(conflictResult.message || 'Booking conflict detected', conflictResult)
    }

    // Calculate total amount
    const duration = calculateDuration(data.start_time, data.end_time)
    const totalAmount = duration * venue.hourly_rate

    // Create booking
    const booking = await this.bookingRepo.create({
      venue_id: data.venue_id,
      renter_id: userId,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      status: 'pending',
      total_amount: totalAmount,
      insurance_required: venue.insurance_required,
      insurance_approved: !venue.insurance_required,
      recurring_type: data.recurring_type || 'none',
      recurring_end_date: data.recurring_end_date,
      notes: data.notes,
    })

    // Log audit
    await this.auditService.logCreate('bookings', booking.id, userId, booking as unknown as Record<string, unknown>)

    // Generate recurring bookings if needed
    if (booking.recurring_type !== 'none') {
      await this.generateRecurringBookings(booking)
    }

    // Determine payment flow flags based on venue settings
    const requiresImmediatePayment = venue.instant_booking && !venue.insurance_required
    const awaitingInsuranceApproval = venue.insurance_required && !booking.insurance_approved
    const awaitingOwnerApproval = !venue.instant_booking

    return {
      ...booking,
      requiresImmediatePayment,
      awaitingOwnerApproval: awaitingOwnerApproval && !awaitingInsuranceApproval,
      awaitingInsuranceApproval,
    }
  }

  /**
   * Check for booking conflicts
   */
  async checkConflicts(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<BookingConflictResult> {
    const supabase = await createClient()

    const [bookings, recurringBookings, venueResult, slotInstancesResult, externalBlocksResult] = await Promise.all([
      this.bookingRepo.findConflictingBookings(venueId, date, startTime, endTime, excludeBookingId),
      this.bookingRepo.findConflictingRecurring(venueId, date, startTime, endTime),
      supabase
        .from('venues')
        .select('instant_booking')
        .eq('id', venueId)
        .single(),
      supabase
        .from('slot_instances')
        .select('id, action_type')
        .eq('venue_id', venueId)
        .eq('date', date)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .eq('is_active', true)
        .in('action_type', ['instant_book', 'request_private']),
      supabase
        .from('external_availability_blocks')
        .select('id, venue_id, source, source_event_id, start_at, end_at, status')
        .eq('venue_id', venueId)
        .eq('status', 'active'),
    ])

    if (bookings.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'time_overlap',
        conflictingBookingId: bookings[0].id,
        message: 'Booking time conflicts with existing booking',
      }
    }

    if (recurringBookings.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'time_overlap',
        conflictingBookingId: recurringBookings[0].id,
        message: 'Booking time conflicts with existing recurring booking',
      }
    }

    if (venueResult.error || !venueResult.data) {
      return {
        hasConflict: true,
        conflictType: 'slot_unavailable',
        message: 'Venue not found while validating slot availability',
      }
    }

    if (slotInstancesResult.error) {
      throw new Error(`Failed to validate slot availability: ${slotInstancesResult.error.message}`)
    }

    const expectedActionType = venueResult.data.instant_booking ? 'instant_book' : 'request_private'
    const matchingSlot = ((slotInstancesResult.data || []) as Array<{ id: string; action_type: string }>)
      .some((slot) => slot.action_type === expectedActionType)

    if (!matchingSlot) {
      return {
        hasConflict: true,
        conflictType: 'slot_unavailable',
        message: 'Requested time slot is not available',
      }
    }

    const isMissingExternalBlocksTable = externalBlocksResult.error?.code === '42P01'
      || externalBlocksResult.error?.message?.toLowerCase().includes('external_availability_blocks')
    if (externalBlocksResult.error && !isMissingExternalBlocksTable) {
      throw new Error(`Failed to validate external availability blocks: ${externalBlocksResult.error.message}`)
    }

    const externalBlocks = isMissingExternalBlocksTable
      ? []
      : ((externalBlocksResult.data || []) as ExternalAvailabilityBlockRow[])
    const hasExternalBlock = externalBlocks.some((block) =>
      overlapsExternalBlock(date, startTime, endTime, block)
    )

    if (hasExternalBlock) {
      return {
        hasConflict: true,
        conflictType: 'slot_unavailable',
        message: 'Requested time slot is blocked by an external calendar event',
      }
    }

    return {
      hasConflict: false,
    }
  }

  /**
   * Generate recurring bookings from parent booking
   */
  async generateRecurringBookings(parentBooking: Booking): Promise<RecurringBooking[]> {
    const instances = calculateRecurringDates(parentBooking)

    const recurringBookings: RecurringBooking[] = []

    for (const instance of instances) {
      const recurring = await this.bookingRepo.createRecurring({
        parent_booking_id: parentBooking.id,
        venue_id: parentBooking.venue_id,
        renter_id: parentBooking.renter_id,
        date: instance.date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        status: instance.status,
        total_amount: instance.total_amount,
        insurance_approved: instance.insurance_approved,
      })

      recurringBookings.push(recurring)

      // Log audit
      await this.auditService.logCreate(
        'recurring_bookings',
        recurring.id,
        parentBooking.renter_id,
        recurring as unknown as Record<string, unknown>
      )
    }

    return recurringBookings
  }

  /**
   * Cancel booking with 48-hour policy and refund processing
   */
  async cancelBooking(bookingId: string, userId: string): Promise<CancellationResult> {
    const supabase = await createClient()
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization and determine if owner-initiated
    let isOwnerInitiated = false
    if (booking.renter_id !== userId) {
      // Check if user is venue owner or admin
      const { data: venue } = await supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && !user?.is_admin) {
        throw badRequest('You do not have permission to cancel this booking')
      }
      
      // Owner or admin is cancelling
      isOwnerInitiated = venue?.owner_id === userId
    }

    // Get cancellation info
    const cancellationInfo = getCancellationInfo(booking.date, booking.start_time)

    // Renters can only cancel if booking hasn't started
    if (!cancellationInfo.canCancel) {
      throw badRequest('Cannot cancel a booking that has already started')
    }

    // Update booking status
    const oldValues = { ...booking }
    const updated = await this.bookingRepo.update(bookingId, { status: 'cancelled' })

    // Log audit
    await this.auditService.logUpdate(
      'bookings',
      bookingId,
      userId,
      oldValues as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    )

    // Process refund if applicable
    let refundResult: { refundId: string; amount: number } | null = null
    
    // Owner cancellation always gets full refund, renter only if within 48-hour window
    const shouldRefund = isOwnerInitiated || cancellationInfo.eligibleForRefund
    
    if (shouldRefund) {
      const refund = await this.paymentService.processRefund(bookingId, userId, isOwnerInitiated)
      if (refund) {
        refundResult = { refundId: refund.refundId, amount: refund.amount }
      }
    }

    return {
      booking: updated,
      refundIssued: refundResult !== null,
      refundAmount: refundResult?.amount,
      refundId: refundResult?.refundId,
    }
  }

  /**
   * Hard delete an unpaid booking (used when user abandons payment flow)
   * Only allows deletion if booking is pending and has no paid payment
   */
  async deleteUnpaidBooking(bookingId: string, userId: string): Promise<void> {
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Only the renter can delete their own unpaid booking
    if (booking.renter_id !== userId) {
      throw badRequest('You do not have permission to delete this booking')
    }

    // Only allow deletion of pending bookings
    if (booking.status !== 'pending') {
      throw badRequest('Only pending bookings can be deleted')
    }

    // Check if there's a paid payment - if so, don't allow deletion
    const payment = await this.paymentService.getPaymentByBookingId(bookingId)
    if (payment?.status === 'paid') {
      throw badRequest('Cannot delete a paid booking. Use cancel instead.')
    }

    // Cancel any authorized payment (release card hold)
    if (payment?.status === 'authorized') {
      await this.paymentService.cancelSetupIntent(bookingId, userId)
    }

    // Log audit before deletion
    await this.auditService.logDelete('bookings', bookingId, userId, booking as unknown as Record<string, unknown>)

    // Hard delete the booking
    await this.bookingRepo.delete(bookingId)
  }

  /**
   * Approve booking (owner confirms) - triggers payment flow
   * Note: Status becomes 'confirmed' only after payment succeeds via webhook
   */
  async confirmBooking(bookingId: string, userId: string): Promise<BookingWithPaymentInfo> {
    const supabase = await createClient()
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check if user is venue owner or admin
    const { data: venue } = await supabase
      .from('venues')
      .select('owner_id, insurance_required, instant_booking')
      .eq('id', booking.venue_id)
      .single()

    if (!venue) {
      throw notFound('Venue not found')
    }

    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (venue.owner_id !== userId && !user?.is_admin) {
      throw badRequest('Only venue owner or admin can confirm bookings')
    }

    // Check insurance requirements
    if (venue.insurance_required && !booking.insurance_approved) {
      throw badRequest('Insurance approval required before confirming booking')
    }

    // Check if payment already exists and is paid
    const existingPayment = await this.paymentService.getPaymentByBookingId(bookingId)
    if (existingPayment?.status === 'paid') {
      // Payment already completed, update status to confirmed
      const updated = await this.bookingRepo.update(bookingId, { status: 'confirmed' })
      
      await this.auditService.logUpdate(
        'bookings',
        bookingId,
        userId,
        booking as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
      )
      
      return { ...updated, requiresPayment: false }
    }

    // For non-instant bookings that require owner approval,
    // we don't change status yet - it stays pending until payment succeeds
    // Just return the booking with requiresPayment flag
    
    // Log the approval action (but don't change status)
    await this.auditService.logUpdate(
      'bookings',
      bookingId,
      userId,
      { action: 'owner_approved' } as unknown as Record<string, unknown>,
      { booking_id: bookingId, approved_by: userId } as unknown as Record<string, unknown>
    )

    return {
      ...booking,
      requiresPayment: true,
    }
  }

  /**
   * Update booking with validation
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>,
    userId: string
  ): Promise<Booking> {
    const supabase = await createClient()
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization
    if (booking.renter_id !== userId) {
      const { data: venue } = await supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && !user?.is_admin) {
        throw badRequest('You do not have permission to update this booking')
      }
    }

    // Validate status transitions
    if (updates.status && updates.status !== booking.status) {
      // Basic validation - can be enhanced with status transition rules
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        throw badRequest('Cannot update completed or cancelled bookings')
      }
    }

    const oldValues = { ...booking }
    const updated = await this.bookingRepo.update(bookingId, updates)

    // Log audit
    await this.auditService.logUpdate(
      'bookings',
      bookingId,
      userId,
      oldValues as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    )

    return updated
  }

  /**
   * Get booking by ID with authorization check
   */
  async getBooking(bookingId: string, userId: string): Promise<Booking> {
    const supabase = await createClient()
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization
    if (booking.renter_id !== userId) {
      const { data: venue } = await supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && !user?.is_admin) {
        throw notFound('Booking not found') // Don't reveal existence
      }
    }

    return booking
  }

  /**
   * List bookings filtered by user role or explicit role_view
   */
  async listBookings(
    filters: {
      status?: BookingStatus
      venue_id?: string
      date_from?: string
      date_to?: string
      time_view?: 'upcoming' | 'past'
      role_view?: 'renter' | 'host'
    },
    userId: string
  ): Promise<Booking[] | BookingWithVenue[]> {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from('users')
      .select('is_admin, is_renter, is_venue_owner')
      .eq('id', userId)
      .single()

    // If role_view is explicitly set, use it
    if (filters.role_view === 'renter') {
      // Return bookings made BY this user (renter view)
      const bookings = await this.bookingRepo.findByRenterWithVenue(userId, {
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      return this.applyTimeViewFilter(bookings, filters.time_view)
    }

    if (filters.role_view === 'host') {
      // Return bookings ON user's venues (host view)
      if (!user?.is_venue_owner) {
        return [] // Not a venue owner, return empty
      }
      const bookings = await this.getVenueBookings(userId, filters)
      return this.applyTimeViewFilter(bookings, filters.time_view)
    }

    // Auto-detect based on user role (legacy behavior)
    // Admins can see all bookings
    if (user?.is_admin) {
      if (filters.venue_id) {
        const bookings = await this.bookingRepo.findByVenue(filters.venue_id, {
          status: filters.status,
          date_from: filters.date_from,
          date_to: filters.date_to,
        })
        return this.applyTimeViewFilter(bookings, filters.time_view)
      }
      if (filters.status) {
        const bookings = await this.bookingRepo.findByStatus(filters.status)
        return this.applyTimeViewFilter(bookings, filters.time_view)
      }
      // Return all bookings for admin (simplified - could add pagination)
      const bookings = await this.bookingRepo.findByRenter(userId, {
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      return this.applyTimeViewFilter(bookings, filters.time_view)
    }

    // Venue owners see their venue's bookings by default
    if (user?.is_venue_owner) {
      const bookings = await this.getVenueBookings(userId, filters)
      return this.applyTimeViewFilter(bookings, filters.time_view)
    }

    // Renters see their own bookings
    if (user?.is_renter) {
      const bookings = await this.bookingRepo.findByRenterWithVenue(userId, {
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      return this.applyTimeViewFilter(bookings, filters.time_view)
    }

    // If user has no capabilities, return empty list
    return []
  }

  /**
   * Filter bookings by temporal view (upcoming or past) using booking start datetime
   */
  private applyTimeViewFilter<T extends { date: string; start_time: string }>(
    bookings: T[],
    timeView?: 'upcoming' | 'past'
  ): T[] {
    if (!timeView) {
      return bookings
    }

    return bookings.filter((booking) => {
      const isPast = isPastBookingStart(booking.date, booking.start_time)
      return timeView === 'past' ? isPast : !isPast
    })
  }

  /**
   * Helper to get all bookings on venues owned by a user
   */
  private async getVenueBookings(
    userId: string,
    filters: {
      status?: BookingStatus
      venue_id?: string
      date_from?: string
      date_to?: string
    }
  ): Promise<Booking[]> {
    const supabase = await createClient()

    if (filters.venue_id) {
      // Verify ownership
      const { data: venue } = await supabase
        .from('venues')
        .select('owner_id')
        .eq('id', filters.venue_id)
        .single()

      if (venue?.owner_id === userId) {
        return this.bookingRepo.findByVenue(filters.venue_id, {
          status: filters.status,
          date_from: filters.date_from,
          date_to: filters.date_to,
        })
      }
      return [] // Not owner of this venue
    }

    // Get all venues owned by user and their bookings
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('owner_id', userId)

    const venueIds = venues?.map((v) => v.id) || []
    const allBookings: Booking[] = []

    for (const venueId of venueIds) {
      const bookings = await this.bookingRepo.findByVenue(venueId, {
        status: filters.status,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      allBookings.push(...bookings)
    }

    return allBookings
  }
}
