'use client'

import { useCallback, useEffect, useState } from 'react'
import type { AdminVenueBookingFeedItem } from '@/types/api'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAdminVenueBookings(venueId: string | null) {
  const [state, setState] = useState<AsyncState<AdminVenueBookingFeedItem[]>>({
    data: null,
    loading: false,
    error: null,
  })

  const refetch = useCallback(async () => {
    if (!venueId) {
      setState({
        data: [],
        loading: false,
        error: null,
      })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`/api/admin/venues/${venueId}/bookings`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch venue bookings')
      }

      setState({
        data: (result.data || []) as AdminVenueBookingFeedItem[],
        loading: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch venue bookings'
      setState({
        data: null,
        loading: false,
        error: message,
      })
    }
  }, [venueId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    ...state,
    refetch,
  }
}
