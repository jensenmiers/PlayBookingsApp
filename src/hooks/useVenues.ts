/**
 * React Hooks for Venue Data Fetching
 * Uses Supabase directly since venue API routes are not yet implemented
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Venue, Availability, VenueSearchFilters } from '@/types'

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

      if (error) throw error

      setState({ data: data || [], loading: false, error: null })
    } catch (error) {
      // Log the actual error for debugging
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
        // Log the actual error for debugging
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
        // Log the actual error for debugging
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
 * Fetch availability for a venue within a date range
 */
export function useVenueAvailabilityRange(
  venueId: string | null,
  dateFrom: string | null,
  dateTo: string | null
) {
  const [state, setState] = useState<UseAsyncState<Availability[]>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!venueId || !dateFrom || !dateTo) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const fetchAvailabilityRange = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('availability')
          .select('*')
          .eq('venue_id', venueId)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .eq('is_available', true)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })

        if (error) throw error
        setState({ data: data || [], loading: false, error: null })
      } catch (error) {
        // Log the actual error for debugging
        console.error('Availability range fetch error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch availability'
        setState({ data: null, loading: false, error: message })
      }
    }

    fetchAvailabilityRange()
  }, [venueId, dateFrom, dateTo])

  return state
}


