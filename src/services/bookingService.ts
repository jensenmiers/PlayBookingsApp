/**
 * Booking service with business logic extracted from database triggers
 */

import { BookingRepository } from '@/repositories/bookingRepository'
import { AvailabilityRepository } from '@/repositories/availabilityRepository'
import { AuditService } from './auditService'
import { checkBookingConflicts } from '@/utils/conflictDetection'
import { calculateRecurringDates } from '@/utils/recurringGenerator'
import { isWithinAdvanceWindow, isWithinCancellationWindow, calculateDuration } from '@/utils/dateHelpers'
import { conflict, badRequest, notFound } from '@/utils/errorHandling'
import type { Booking, RecurringBooking, CreateBookingForm } from '@/types'
import { createClient } from '@/lib/supabase/server'

export class BookingService {
  private bookingRepo = new BookingRepository()
  private availabilityRepo = new AvailabilityRepository()
  private auditService = new AuditService()
  private supabase = createClient()

  /**
   * Create a new booking with full validation
   */
  async createBooking(data: CreateBookingForm, userId: string): Promise<Booking> {
    // Get venue to check advance booking window and calculate amount
    const { data: venue, error: venueError } = await this.supabase
      .from('venues')
      .select('*')
      .eq('id', data.venue_id)
      .single()

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    // Check advance booking window
    if (!isWithinAdvanceWindow(data.date, venue.max_advance_booking_days)) {
      throw badRequest(
        `Booking exceeds maximum advance booking period of ${venue.max_advance_booking_days} days`
      )
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
      insurance_approved: !venue.insurance_required, // Auto-approve if not required
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

    return booking
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
  ) {
    // Get all relevant bookings and recurring bookings
    const [bookings, recurringBookings, availabilityBlocks] = await Promise.all([
      this.bookingRepo.findConflictingBookings(venueId, date, startTime, endTime, excludeBookingId),
      this.bookingRepo.findConflictingRecurring(venueId, date, startTime, endTime),
      this.availabilityRepo.findByVenueAndDate(venueId, date),
    ])

    return checkBookingConflicts(
      bookings,
      recurringBookings,
      availabilityBlocks,
      venueId,
      date,
      startTime,
      endTime,
      excludeBookingId
    )
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
   * Cancel booking with 48-hour policy validation
   */
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization
    if (booking.renter_id !== userId) {
      // Check if user is venue owner or admin
      const { data: venue } = await this.supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && user?.role !== 'admin') {
        throw badRequest('You do not have permission to cancel this booking')
      }
    }

    // Check cancellation policy (48 hours)
    if (!isWithinCancellationWindow(booking.date)) {
      throw badRequest('Cancellations must be made at least 48 hours in advance')
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

    return updated
  }

  /**
   * Confirm booking with insurance validation
   */
  async confirmBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check if user is venue owner or admin
    const { data: venue } = await this.supabase
      .from('venues')
      .select('owner_id, insurance_required')
      .eq('id', booking.venue_id)
      .single()

    if (!venue) {
      throw notFound('Venue not found')
    }

    const { data: user } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (venue.owner_id !== userId && user?.role !== 'admin') {
      throw badRequest('Only venue owner or admin can confirm bookings')
    }

    // Check insurance requirements
    if (venue.insurance_required && !booking.insurance_approved) {
      throw badRequest('Insurance approval required before confirming booking')
    }

    // Update booking status
    const oldValues = { ...booking }
    const updated = await this.bookingRepo.update(bookingId, { status: 'confirmed' })

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
   * Update booking with validation
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>,
    userId: string
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization
    if (booking.renter_id !== userId) {
      const { data: venue } = await this.supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && user?.role !== 'admin') {
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
    const booking = await this.bookingRepo.findById(bookingId)

    if (!booking) {
      throw notFound('Booking not found')
    }

    // Check authorization
    if (booking.renter_id !== userId) {
      const { data: venue } = await this.supabase
        .from('venues')
        .select('owner_id')
        .eq('id', booking.venue_id)
        .single()

      const { data: user } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (venue?.owner_id !== userId && user?.role !== 'admin') {
        throw notFound('Booking not found') // Don't reveal existence
      }
    }

    return booking
  }

  /**
   * List bookings filtered by user role
   */
  async listBookings(
    filters: {
      status?: string
      venue_id?: string
      date_from?: string
      date_to?: string
    },
    userId: string
  ): Promise<Booking[]> {
    const { data: user } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    // Admins can see all bookings
    if (user?.role === 'admin') {
      if (filters.venue_id) {
        return this.bookingRepo.findByVenue(filters.venue_id, {
          status: filters.status as any,
          date_from: filters.date_from,
          date_to: filters.date_to,
        })
      }
      if (filters.status) {
        return this.bookingRepo.findByStatus(filters.status as any)
      }
      // Return all bookings for admin (simplified - could add pagination)
      return this.bookingRepo.findByRenter(userId, {
        status: filters.status as any,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
    }

    // Venue owners see their venue's bookings
    if (user?.role === 'venue_owner') {
      if (filters.venue_id) {
        // Verify ownership
        const { data: venue } = await this.supabase
          .from('venues')
          .select('owner_id')
          .eq('id', filters.venue_id)
          .single()

        if (venue?.owner_id === userId) {
          return this.bookingRepo.findByVenue(filters.venue_id, {
            status: filters.status as any,
            date_from: filters.date_from,
            date_to: filters.date_to,
          })
        }
      }
      // Get all venues owned by user and their bookings
      const { data: venues } = await this.supabase
        .from('venues')
        .select('id')
        .eq('owner_id', userId)

      const venueIds = venues?.map((v) => v.id) || []
      const allBookings: Booking[] = []

      for (const venueId of venueIds) {
        const bookings = await this.bookingRepo.findByVenue(venueId, {
          status: filters.status as any,
          date_from: filters.date_from,
          date_to: filters.date_to,
        })
        allBookings.push(...bookings)
      }

      return allBookings
    }

    // Renters see their own bookings
    return this.bookingRepo.findByRenter(userId, {
      status: filters.status as any,
      date_from: filters.date_from,
      date_to: filters.date_to,
    })
  }
}


