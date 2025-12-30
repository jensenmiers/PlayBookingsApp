/**
 * Availability repository for data access
 */

import { createClient } from '@/lib/supabase/server'
import type { Availability } from '@/types'

export class AvailabilityRepository {
  /**
   * Find availability blocks for a venue and date
   */
  async findByVenueAndDate(venueId: string, date: string): Promise<Availability[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .order('start_time', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch availability: ${error.message}`)
    }

    return (data || []) as Availability[]
  }

  /**
   * Check if a time slot is available
   */
  async checkAvailability(
    venueId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const blocks = await this.findByVenueAndDate(venueId, date)
    
    // Check if any available block covers the requested time
    return blocks.some((block) => {
      if (!block.is_available) return false
      
      // Check if requested time is within this block
      return block.start_time <= startTime && block.end_time >= endTime
    })
  }

  /**
   * Find available time slots for a venue and date
   */
  async findAvailableSlots(venueId: string, date: string): Promise<Availability[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('venue_id', venueId)
      .eq('date', date)
      .eq('is_available', true)
      .order('start_time', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch available slots: ${error.message}`)
    }

    return (data || []) as Availability[]
  }
}



