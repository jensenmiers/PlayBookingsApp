/**
 * Booking repository for data access
 */

import { createClient } from '@/lib/supabase/server'
import type { Booking, RecurringBooking, BookingStatus, BookingWithVenue } from '@/types'

export class BookingRepository {
  /**
   * Create a new booking
   */
  async create(data: {
    venue_id: string
    renter_id: string
    date: string
    start_time: string
    end_time: string
    status?: BookingStatus
    total_amount: number
    insurance_approved?: boolean
    insurance_required?: boolean
    recurring_type?: 'none' | 'weekly' | 'monthly'
    recurring_end_date?: string
    notes?: string
  }): Promise<Booking> {
    const supabase = await createClient()
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        ...data,
        status: data.status || 'pending',
        insurance_approved: data.insurance_approved ?? false,
        insurance_required: data.insurance_required ?? true,
        recurring_type: data.recurring_type || 'none',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create booking: ${error.message}`)
    }

    return booking as Booking
  }

  /**
   * Find booking by ID
   */
  async findById(id: string): Promise<Booking | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch booking: ${error.message}`)
    }

    return data as Booking
  }

  /**
   * Find bookings by renter
   */
  async findByRenter(renterId: string, filters?: {
    status?: BookingStatus
    date_from?: string
    date_to?: string
  }): Promise<Booking[]> {
    const supabase = await createClient()
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('renter_id', renterId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`)
    }

    return (data || []) as Booking[]
  }

  /**
   * Find bookings by renter with venue data
   */
  async findByRenterWithVenue(renterId: string, filters?: {
    status?: BookingStatus
    date_from?: string
    date_to?: string
  }): Promise<BookingWithVenue[]> {
    const supabase = await createClient()
    let query = supabase
      .from('bookings')
      .select(`
        *,
        venue:venues!bookings_venue_id_fkey (
          id,
          name,
          instant_booking,
          insurance_required
        )
      `)
      .eq('renter_id', renterId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch bookings with venue: ${error.message}`)
    }

    return (data || []) as BookingWithVenue[]
  }

  /**
   * Find bookings by venue
   */
  async findByVenue(venueId: string, filters?: {
    status?: BookingStatus
    date_from?: string
    date_to?: string
  }): Promise<Booking[]> {
    const supabase = await createClient()
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('venue_id', venueId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date_from) {
      query = query.gte('date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('date', filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`)
    }

    return (data || []) as Booking[]
  }

  /**
   * Find bookings by status
   */
  async findByStatus(status: BookingStatus): Promise<Booking[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', status)
      .order('date', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch bookings: ${error.message}`)
    }

    return (data || []) as Booking[]
  }

  /**
   * Update booking
   */
  async update(id: string, updates: Partial<Booking>): Promise<Booking> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update booking: ${error.message}`)
    }

    return data as Booking
  }

  /**
   * Delete booking (soft delete by setting status to cancelled)
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete booking: ${error.message}`)
    }
  }

  /**
   * Find conflicting bookings
   */
  async findConflictingBookings(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    const supabase = await createClient()
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed'])

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch conflicting bookings: ${error.message}`)
    }

    // Filter by time overlap in application layer
    const bookings = (data || []) as Booking[]
    return bookings.filter((booking) => {
      // Check if times overlap: start1 < end2 && end1 > start2
      return startTime < booking.end_time && endTime > booking.start_time
    })
  }

  /**
   * Find conflicting recurring bookings
   */
  async findConflictingRecurring(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeRecurringId?: string
  ): Promise<RecurringBooking[]> {
    const supabase = await createClient()
    let query = supabase
      .from('recurring_bookings')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed'])

    if (excludeRecurringId) {
      query = query.neq('id', excludeRecurringId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch conflicting recurring bookings: ${error.message}`)
    }

    // Filter by time overlap in application layer
    const recurring = (data || []) as RecurringBooking[]
    return recurring.filter((recurring) => {
      // Check if times overlap: start1 < end2 && end1 > start2
      return startTime < recurring.end_time && endTime > recurring.start_time
    })
  }

  /**
   * Create recurring booking instance
   */
  async createRecurring(data: {
    parent_booking_id: string
    venue_id: string
    renter_id: string
    date: string
    start_time: string
    end_time: string
    status?: BookingStatus
    total_amount: number
    insurance_approved?: boolean
  }): Promise<RecurringBooking> {
    const supabase = await createClient()
    const { data: recurring, error } = await supabase
      .from('recurring_bookings')
      .insert({
        ...data,
        status: data.status || 'pending',
        insurance_approved: data.insurance_approved ?? false,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create recurring booking: ${error.message}`)
    }

    return recurring as RecurringBooking
  }

  /**
   * Find recurring bookings by parent booking
   */
  async findByParentBooking(parentBookingId: string): Promise<RecurringBooking[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('parent_booking_id', parentBookingId)
      .order('date', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch recurring bookings: ${error.message}`)
    }

    return (data || []) as RecurringBooking[]
  }
}



