/**
 * React Hooks for Venue Data Fetching
 * Uses Supabase directly since venue API routes are not yet implemented
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Venue,
  VenueSearchFilters,
  SlotActionType,
  SlotModalContent,
  SlotPricing,
} from '@/types'
import {
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  normalizeVenueWithMedia,
  type VenueWithOptionalMediaFields,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'

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
      const applyVenueFilters = (query: any) => {
        let nextQuery = query

        if (filters?.city) {
          nextQuery = nextQuery.eq('city', filters.city)
        }
        if (filters?.state) {
          nextQuery = nextQuery.eq('state', filters.state)
        }
        if (filters?.min_price !== undefined) {
          nextQuery = nextQuery.gte('hourly_rate', filters.min_price)
        }
        if (filters?.max_price !== undefined) {
          nextQuery = nextQuery.lte('hourly_rate', filters.max_price)
        }
        if (filters?.insurance_required !== undefined) {
          nextQuery = nextQuery.eq('insurance_required', filters.insurance_required)
        }
        if (filters?.instant_booking !== undefined) {
          nextQuery = nextQuery.eq('instant_booking', filters.instant_booking)
        }
        if (filters?.booking_mode !== undefined) {
          nextQuery = nextQuery.eq('booking_mode', filters.booking_mode)
        }
        if (filters?.access === 'open_gym') {
          nextQuery = nextQuery.eq('offers_open_gym', true)
        } else if (filters?.access === 'private_rental') {
          nextQuery = nextQuery.eq('offers_private_rental', true)
        }

        return nextQuery
      }

      let { data, error } = await applyVenueFilters(
        supabase.from('venues').select(VENUE_SELECT_WITH_MEDIA).eq('is_active', true)
      ).order('created_at', { ascending: false })

      if (error && isMissingVenueMediaQueryError(error)) {
        ;({ data, error } = await applyVenueFilters(
          supabase.from('venues').select('*').eq('is_active', true)
        ).order('created_at', { ascending: false }))
      }

      if (error) {
        console.error('Venue fetch error:', error)
        throw error
      }

      const venueRows = data as unknown as Array<Venue & VenueWithOptionalMediaFields> | null
      setState({ data: normalizeVenueCollectionWithMedia(venueRows), loading: false, error: null })
    } catch (error) {
      console.error('Venue fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch venues'
      setState({ data: null, loading: false, error: message })
    }
  }, [filters?.city, filters?.state, filters?.min_price, filters?.max_price, filters?.insurance_required, filters?.instant_booking, filters?.booking_mode, filters?.access])

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
        let { data, error } = await supabase
          .from('venues')
          .select(VENUE_SELECT_WITH_MEDIA)
          .eq('id', id)
          .single()

        if (error && isMissingVenueMediaQueryError(error)) {
          ;({ data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('id', id)
            .single())
        }

        if (error) throw error
        const venueRecord = data as unknown as Venue & VenueWithOptionalMediaFields
        setState({ data: normalizeVenueWithMedia(venueRecord), loading: false, error: null })
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
  slot_pricing?: SlotPricing | null
}

function buildAvailabilityRangeKey(
  venueId: string | null,
  dateFrom: string | null,
  dateTo: string | null
): string | null {
  if (!venueId || !dateFrom || !dateTo) {
    return null
  }

  return `${venueId}::${dateFrom}::${dateTo}`
}

/**
 * Fetch true availability for a venue within a date range
 * Uses the API route that filters out existing bookings
 * Includes refetch-on-focus behavior for freshness
 */
export function useVenueAvailabilityRange(
  venueId: string | null,
  dateFrom: string | null,
  dateTo: string | null,
  options?: {
    initialData?: ComputedAvailabilitySlot[] | null
    initialPublishedThrough?: string | null
  }
) {
  const rangeKey = buildAvailabilityRangeKey(venueId, dateFrom, dateTo)
  const [state, setState] = useState<UseAsyncState<ComputedAvailabilitySlot[]> & { rangeKey: string | null; publishedThrough?: string | null }>({
    rangeKey,
    publishedThrough: options?.initialPublishedThrough,
    data: options?.initialData ?? null,
    loading: options?.initialData ? false : true,
    error: null,
  })
  const initialHydratedRangeKeyRef = useRef(
    options?.initialData ? buildAvailabilityRangeKey(venueId, dateFrom, dateTo) : null
  )
  const initialHydrationSkipConsumedRef = useRef(false)

  const requestVersion = useRef(0)

  const fetchAvailabilityRange = useCallback(async () => {
    const version = ++requestVersion.current
    const requestKey = buildAvailabilityRangeKey(venueId, dateFrom, dateTo)
    if (!venueId || !dateFrom || !dateTo) {
      setState({ rangeKey: requestKey, data: null, loading: false, error: null })
      return
    }

    setState((prev) => ({
      rangeKey: requestKey,
      data: prev.rangeKey === requestKey ? prev.data : null,
      publishedThrough: prev.rangeKey === requestKey ? prev.publishedThrough : null,
      loading: prev.rangeKey !== requestKey || !prev.data,
      error: null,
    }))
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

      if (version !== requestVersion.current) return
      setState({ rangeKey: requestKey, data: result.data || [], publishedThrough: result.published_through ?? null, loading: false, error: null })
    } catch (error) {
      if (version !== requestVersion.current) return
      console.error('Availability range fetch error:', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch availability'
      setState((prev) => {
        if (prev.rangeKey === requestKey && prev.data) {
          return {
            rangeKey: requestKey,
            data: prev.data,
            publishedThrough: prev.publishedThrough,
            loading: false,
            error: null,
          }
        }

        return {
          rangeKey: requestKey,
          data: null,
          loading: false,
          error: message,
        }
      })
    }
  }, [venueId, dateFrom, dateTo])

  // Initial fetch
  useEffect(() => {
    const currentRangeKey = buildAvailabilityRangeKey(venueId, dateFrom, dateTo)
    if (
      !initialHydrationSkipConsumedRef.current
      && initialHydratedRangeKeyRef.current
      && currentRangeKey === initialHydratedRangeKeyRef.current
    ) {
      initialHydrationSkipConsumedRef.current = true
      return
    }

    void fetchAvailabilityRange()
    return () => { requestVersion.current += 1 }
  }, [fetchAvailabilityRange, venueId, dateFrom, dateTo])

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
    data: state.rangeKey === rangeKey ? state.data : null,
    loading: state.rangeKey === rangeKey ? state.loading : Boolean(rangeKey),
    error: state.rangeKey === rangeKey ? state.error : null,
    publishedThrough: state.rangeKey === rangeKey ? state.publishedThrough : null,
    refetch: fetchAvailabilityRange,
  }
}
