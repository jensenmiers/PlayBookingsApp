/**
 * Hook for fetching venues with their next available time slot
 * Uses the get_venues_with_next_available RPC function for efficient querying
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Venue data with next available slot for map display
 */
export interface MapVenue {
  id: string
  name: string
  city: string
  state: string
  address: string
  hourlyRate: number
  instantBooking: boolean
  latitude: number
  longitude: number
  distanceMiles: number | null
  nextAvailable: NextAvailableSlot | null
}

export interface NextAvailableSlot {
  slotId: string
  date: string        // ISO date string (YYYY-MM-DD)
  startTime: string   // HH:MM:SS
  endTime: string     // HH:MM:SS
  displayText: string // "Today 3:00 PM" or "Tomorrow 9:00 AM" or "Jan 25 2:00 PM"
}

interface UseVenuesOptions {
  /** Filter to a specific date (YYYY-MM-DD format) */
  dateFilter?: string
  /** User's latitude for distance calculation */
  userLat?: number
  /** User's longitude for distance calculation */
  userLng?: number
  /** Filter venues within this radius (miles) */
  radiusMiles?: number
}

interface UseVenuesResult {
  data: MapVenue[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Format the next available slot for display
 * Returns "Today 3:00 PM", "Tomorrow 9:00 AM", or "Jan 25 2:00 PM"
 */
function formatNextAvailable(dateStr: string, timeStr: string): string {
  // Parse date as local date (not UTC)
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(year, month - 1, day)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Format time (handle both HH:MM:SS and HH:MM formats)
  const timeParts = timeStr.split(':')
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  
  const timeDate = new Date()
  timeDate.setHours(hours, minutes, 0, 0)
  const formattedTime = timeDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  // Format date portion
  if (slotDate.getTime() === today.getTime()) {
    return `Today ${formattedTime}`
  } else if (slotDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${formattedTime}`
  } else {
    const formattedDate = slotDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    return `${formattedDate} ${formattedTime}`
  }
}

/**
 * Hook to fetch venues with their next available time slot
 * 
 * @example
 * ```tsx
 * const { data, loading, error } = useVenuesWithNextAvailable({
 *   dateFilter: '2026-01-25',
 *   userLat: 34.0522,
 *   userLng: -118.2437,
 *   radiusMiles: 25
 * })
 * ```
 */
export function useVenuesWithNextAvailable(options: UseVenuesOptions = {}): UseVenuesResult {
  const [data, setData] = useState<MapVenue[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Call the RPC function with parameters
      const { data: result, error: rpcError } = await supabase.rpc(
        'get_venues_with_next_available',
        {
          p_date_filter: options.dateFilter || null,
          p_user_lat: options.userLat || null,
          p_user_lng: options.userLng || null,
          p_radius_miles: options.radiusMiles || null,
        }
      )

      if (rpcError) {
        console.error('RPC error:', rpcError)
        throw new Error(rpcError.message)
      }

      // Transform database response to MapVenue format
      const venues: MapVenue[] = (result || []).map((row: {
        venue_id: string
        venue_name: string
        venue_city: string
        venue_state: string
        venue_address: string
        hourly_rate: number
        instant_booking: boolean
        latitude: number
        longitude: number
        distance_miles: number | null
        next_slot_id: string | null
        next_slot_date: string | null
        next_slot_start_time: string | null
        next_slot_end_time: string | null
      }) => ({
        id: row.venue_id,
        name: row.venue_name,
        city: row.venue_city,
        state: row.venue_state,
        address: row.venue_address,
        hourlyRate: Number(row.hourly_rate),
        instantBooking: row.instant_booking,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        distanceMiles: row.distance_miles,
        nextAvailable: row.next_slot_id && row.next_slot_date && row.next_slot_start_time ? {
          slotId: row.next_slot_id,
          date: row.next_slot_date,
          startTime: row.next_slot_start_time,
          endTime: row.next_slot_end_time || '',
          displayText: formatNextAvailable(row.next_slot_date, row.next_slot_start_time),
        } : null,
      }))

      setData(venues)
    } catch (err) {
      console.error('Failed to fetch venues with availability:', err)
      const message = err instanceof Error ? err.message : 'Failed to fetch venues'
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [options.dateFilter, options.userLat, options.userLng, options.radiusMiles])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  return { data, loading, error, refetch: fetchVenues }
}

/**
 * Get user's current location (browser geolocation API)
 * Returns null if geolocation is not available or denied
 */
export function useUserLocation(): { 
  latitude: number | null
  longitude: number | null
  loading: boolean
  error: string | null 
} {
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLoading(false)
      },
      (err) => {
        // Don't treat permission denied as an error - user can still see all venues
        console.log('Geolocation not available:', err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    )
  }, [])

  return { latitude, longitude, loading, error }
}
