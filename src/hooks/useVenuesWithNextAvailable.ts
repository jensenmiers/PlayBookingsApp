/**
 * Hook for fetching venues with their next available time slot
 * Uses the get_venues_with_next_available RPC function for efficient querying
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'
import type { BookingMode } from '@/types'

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
  bookingMode: BookingMode | null
  insuranceRequired: boolean
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
  displayText: string // "Fri 6:00 PM"
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
        booking_mode: BookingMode | null
        insurance_required: boolean
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
        bookingMode: row.booking_mode,
        insuranceRequired: row.insurance_required,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        distanceMiles: row.distance_miles,
        nextAvailable: row.next_slot_id && row.next_slot_date && row.next_slot_start_time ? {
          slotId: row.next_slot_id,
          date: row.next_slot_date,
          startTime: row.next_slot_start_time,
          endTime: row.next_slot_end_time || '',
          displayText: formatCompactNextAvailable(row.next_slot_date, row.next_slot_start_time),
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
 * Get user's current location (browser geolocation API).
 * Does not request location on mount; call requestLocation() when the user opts in.
 * Returns null if geolocation is not available or denied.
 */
export function useUserLocation(): {
  latitude: number | null
  longitude: number | null
  loading: boolean
  error: string | null
  requestLocation: () => void
} {
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      return
    }
    setError(null)
    setLoading(true)
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

  return { latitude, longitude, loading, error, requestLocation }
}
