/**
 * Hook for fetching venues with their next available time slot.
 * Uses GET /api/venues/next-available (classic API style).
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { MapVenue } from '@/lib/venueDiscovery'

export type { MapVenue, NextAvailableSlot } from '@/lib/venueDiscovery'

const VENUE_DISCOVERY_TIMEOUT_MS = 12_000
const VENUE_DISCOVERY_TIMEOUT_MESSAGE = 'Timed out loading venues. Please try again.'

function withVenueDiscoveryTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(VENUE_DISCOVERY_TIMEOUT_MESSAGE))
    }, VENUE_DISCOVERY_TIMEOUT_MS)
  })

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
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

function buildNextAvailableUrl(options: UseVenuesOptions): string {
  const params = new URLSearchParams()
  if (options.dateFilter) {
    params.set('date', options.dateFilter)
  }
  if (options.userLat != null) {
    params.set('lat', String(options.userLat))
  }
  if (options.userLng != null) {
    params.set('lng', String(options.userLng))
  }
  if (options.radiusMiles != null) {
    params.set('radiusMiles', String(options.radiusMiles))
  }
  const query = params.toString()
  return query ? `/api/venues/next-available?${query}` : '/api/venues/next-available'
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
  const latestRequestIdRef = useRef(0)
  const dataRef = useRef<MapVenue[] | null>(null)
  const loadingRef = useRef(loading)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  const fetchVenues = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId

    setLoading(dataRef.current === null)
    setError(null)

    try {
      const { response, body } = await withVenueDiscoveryTimeout(
        (async () => {
          const response = await fetch(buildNextAvailableUrl(options), { cache: 'no-store' })
          const body = await response.json().catch(() => null)
          return { response, body }
        })()
      )

      if (latestRequestIdRef.current !== requestId) {
        return
      }

      if (!response.ok || !body?.success) {
        const message =
          body?.error?.message ||
          (typeof body?.error === 'string' ? body.error : null) ||
          'Failed to fetch venues'
        throw new Error(message)
      }

      const venues = (body.data || []) as MapVenue[]
      dataRef.current = venues
      setData(venues)
      setError(null)
    } catch (err) {
      if (latestRequestIdRef.current !== requestId) {
        return
      }

      console.error('Failed to fetch venues with availability:', err)
      const message = err instanceof Error ? err.message : 'Failed to fetch venues'
      const previousData = dataRef.current

      if (previousData !== null) {
        setData(previousData)
        setError(null)
      } else {
        setError(message)
        setData(null)
      }
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [options.dateFilter, options.userLat, options.userLng, options.radiusMiles])

  useEffect(() => {
    fetchVenues()
  }, [fetchVenues])

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || (dataRef.current === null && loadingRef.current)) {
        void fetchVenues()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && dataRef.current === null && loadingRef.current) {
        void fetchVenues()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
