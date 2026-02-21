/**
 * React Hooks for Venue Data Fetching
 * Uses Supabase directly since venue API routes are not yet implemented
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Venue,
  Availability,
  VenueSearchFilters,
  AvailabilityWithVenue,
  SlotActionType,
  SlotModalContent,
} from '@/types'
import { getNextTopOfHour, timeStringToDate } from '@/utils/dateHelpers'
import { slugify } from '@/lib/utils'
import { format } from 'date-fns'

/**
 * Hook state interface
 */
interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Fetch list of venues with optional filters
 */
export function useVenues(filters?: VenueSearchFilters) {
  const [state, setState] = useState<UseAsyncState<Venue[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchVenues = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const supabase = createClient()
      let query = supabase.from('venues').select('*').eq('is_active', true)

      if (filters?.city) {
        query = query.eq('city', filters.city)
      }
      if (filters?.state) {
        query = query.eq('state', filters.state)
      }
      if (filters?.min_price !== undefined) {
        query = query.gte('hourly_rate', filters.min_price)
      }
      if (filters?.max_price !== undefined) {
        query = query.lte('hourly_rate', filters.max_price)
      }
      if (filters?.insurance_required !== undefined) {
        query = query.eq('insurance_required', filters.insurance_required)
      }
      if (filters?.instant_booking !== undefined) {
        query = query.eq('instant_booking', filters.instant_booking)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Venue fetch error:', error)
        throw error
      }

      setState({ data: data || [], loading: false, error: null })
    } catch (error) {
      console.error('Venue fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch venues'
      setState({ data: null, loading: false, error: message })
    }
  }, [filters?.city, filters?.state, filters?.min_price, filters?.max_price, filters?.insurance_required, filters?.instant_booking])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  return {
    ...state,
    refetch: fetchVenues,
  }
}

/**
 * Fetch a single venue by ID
 */
export function useVenue(id: string | null) {
  const [state, setState] = useState<UseAsyncState<Venue>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const fetchVenue = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setState({ data, loading: false, error: null })
      } catch (error) {
        console.error('Venue fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch venue'
        setState({ data: null, loading: false, error: message })
      }
    }

    fetchVenue()
  }, [id])

  return state
}

/**
 * Fetch a single venue by slugified name
 * Fetches all venues and finds the one matching the slug
 */
export function useVenueBySlug(slug: string | null) {
  const [state, setState] = useState<UseAsyncState<Venue>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!slug) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const fetchVenueBySlug = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const supabase = createClient()
        const { data: venues, error } = await supabase
          .from('venues')
          .select('*')
          .eq('is_active', true)

        if (error) throw error

        // Find venue by matching slugified name
        const venue = venues?.find((v) => slugify(v.name) === slug) || null

        if (!venue) {
          setState({ data: null, loading: false, error: 'Venue not found' })
          return
        }

        setState({ data: venue, loading: false, error: null })
      } catch (error) {
        console.error('Venue fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch venue'
        setState({ data: null, loading: false, error: message })
      }
    }

    fetchVenueBySlug()
  }, [slug])

  return state
}

/**
 * Fetch availability for a venue on a specific date
 */
export function useVenueAvailability(venueId: string | null, date: string | null) {
  const [state, setState] = useState<UseAsyncState<Availability[]>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!venueId || !date) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const fetchAvailability = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('availability')
          .select('*')
          .eq('venue_id', venueId)
          .eq('date', date)
          .eq('is_available', true)
          .order('start_time', { ascending: true })

        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (error) {
        console.error('Availability fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch availability'
        setState({ data: null, loading: false, error: message })
      }
    }

    fetchAvailability()
  }, [venueId, date])

  return state
}

/**
 * Computed available slot from the availability API
 * This type matches what the API returns after filtering out booked slots
 */
export interface ComputedAvailabilitySlot {
  date: string
  start_time: string
  end_time: string
  venue_id: string
  availability_id?: string | null
  slot_instance_id?: string | null
  action_type: SlotActionType
  modal_content?: SlotModalContent | null
}

/**
 * Fetch true availability for a venue within a date range
 * Uses the API route that filters out existing bookings
 * Includes refetch-on-focus behavior for freshness
 */
export function useVenueAvailabilityRange(
  venueId: string | null,
  dateFrom: string | null,
  dateTo: string | null
) {
  const [state, setState] = useState<UseAsyncState<ComputedAvailabilitySlot[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchAvailabilityRange = useCallback(async () => {
    if (!venueId || !dateFrom || !dateTo) {
      setState({ data: null, loading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      })
      
      const response = await fetch(`/api/venues/${venueId}/availability?${params}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch availability')
      }

      setState({ data: result.data || [], loading: false, error: null })
    } catch (error) {
      console.error('Availability range fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch availability'
      setState({ data: null, loading: false, error: message })
    }
  }, [venueId, dateFrom, dateTo])

  // Initial fetch
  useEffect(() => {
    fetchAvailabilityRange()
  }, [fetchAvailabilityRange])

  // Refetch on window focus (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && venueId && dateFrom && dateTo) {
        fetchAvailabilityRange()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchAvailabilityRange, venueId, dateFrom, dateTo])

  return {
    ...state,
    refetch: fetchAvailabilityRange,
  }
}

/**
 * Fetch availability slots with venue information for search page
 */
export function useAvailabilitySlots(filters?: {
  date?: string // YYYY-MM-DD format, defaults to today
  time?: string // Optional time filter (HH:MM format), defaults to "Any time"
}) {
  const [state, setState] = useState<UseAsyncState<AvailabilityWithVenue[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchAvailabilitySlots = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const supabase = createClient()
      const today = format(new Date(), 'yyyy-MM-dd')
      const selectedDate = filters?.date || today
      const isToday = selectedDate === today

      // Calculate minimum start time (next top-of-hour if today, otherwise any time)
      let minStartTime: string | null = null
      if (isToday) {
        const nextHour = getNextTopOfHour()
        minStartTime = format(nextHour, 'HH:mm:ss')
      }

      // Build query with join to venues
      // Note: Supabase uses the foreign key relationship name for joins
      let query = supabase
        .from('availability')
        .select(`
          *,
          venue:venues (*)
        `)
        .eq('date', selectedDate)
        .eq('is_available', true)

      // Filter by minimum start time if today
      if (minStartTime) {
        query = query.gte('start_time', minStartTime)
      }

      // Optional time filter (specific hour)
      if (filters?.time && filters.time !== 'Any time') {
        // Filter slots that start at or after the selected time
        const filterTime = filters.time.length === 5 ? `${filters.time}:00` : filters.time
        query = query.gte('start_time', filterTime)
      }

      // Order by start_time ascending
      const { data, error } = await query.order('start_time', { ascending: true })

      if (error) {
        console.error('Availability slots fetch error:', error)
        throw error
      }

      const transformedData: AvailabilityWithVenue[] = (data || []).map((item) => ({
        id: item.id,
        venue_id: item.venue_id,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        is_available: item.is_available,
        created_at: item.created_at,
        updated_at: item.updated_at,
        venue: item.venue as Venue,
      }))
        .filter((item: AvailabilityWithVenue) => {
          // Additional client-side filtering for today to ensure slots are in the future
          if (isToday) {
            const slotDateTime = timeStringToDate(item.date, item.start_time)
            const now = new Date()
            return slotDateTime >= now
          }
          return true
        })

      setState({ data: transformedData, loading: false, error: null })
    } catch (error) {
      console.error('Availability slots fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch availability slots'
      setState({ data: null, loading: false, error: message })
    }
  }, [filters?.date, filters?.time])

  useEffect(() => {
    fetchAvailabilitySlots()
  }, [fetchAvailabilitySlots])

  return {
    ...state,
    refetch: fetchAvailabilitySlots,
  }
}

