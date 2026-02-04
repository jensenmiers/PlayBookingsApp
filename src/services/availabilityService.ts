/**
 * Availability service for computing true venue availability
 * Combines availability records with booking data to return slots that are actually bookable
 */

import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots, ComputedSlot } from '@/utils/slotSplitting'
import type { Availability, Booking, RecurringBooking } from '@/types'

export class AvailabilityService {
  /**
   * Get true available slots for a venue within a date range
   * Filters out slots that overlap with existing bookings
   * 
   * @param venueId - The venue ID
   * @param dateFrom - Start date (YYYY-MM-DD)
   * @param dateTo - End date (YYYY-MM-DD)
   * @returns Array of computed available slots
   */
  async getAvailableSlots(
    venueId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<ComputedSlot[]> {
    const supabase = await createClient()

    // Fetch availability records, bookings, and recurring bookings in parallel
    const [availabilityResult, bookingsResult, recurringResult] = await Promise.all([
      supabase
        .from('availability')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      
      supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),
      
      supabase
        .from('recurring_bookings')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),
    ])

    if (availabilityResult.error) {
      throw new Error(`Failed to fetch availability: ${availabilityResult.error.message}`)
    }

    if (bookingsResult.error) {
      throw new Error(`Failed to fetch bookings: ${bookingsResult.error.message}`)
    }

    if (recurringResult.error) {
      throw new Error(`Failed to fetch recurring bookings: ${recurringResult.error.message}`)
    }

    const availability = (availabilityResult.data || []) as Availability[]
    const bookings = (bookingsResult.data || []) as Booking[]
    const recurringBookings = (recurringResult.data || []) as RecurringBooking[]

    // Compute true available slots using the slot splitting utility
    return computeAvailableSlots(availability, bookings, recurringBookings)
  }
}
