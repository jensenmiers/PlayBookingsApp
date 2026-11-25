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

  const approveInsurance = useCallback(async (bookingId: string): Promise<{ success: boolean; error: string | null }> => {
    if (!venueId) {
      return { success: false, error: 'Venue is required' }
    }

    try {
      const response = await fetch(`/api/admin/venues/${venueId}/bookings/${bookingId}/insurance-approve`, {
        method: 'POST',
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error?.message || 'Failed to approve insurance' }
      }

      return { success: true, error: null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve insurance',
      }
    }
  }, [venueId])

  const decideRequest = useCallback(async (
    bookingId: string,
    decision: 'confirm' | 'decline',
    reason?: string
  ): Promise<{ success: boolean; error: string | null; message: string | null }> => {
    if (!venueId) {
      return { success: false, error: 'Venue is required', message: null }
    }

    try {
      const response = await fetch(
        `/api/admin/venues/${venueId}/bookings/${bookingId}/${decision}-request`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(decision === 'decline' && reason?.trim() ? { reason: reason.trim() } : {}),
        }
      )
      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error?.message || `Failed to ${decision} request`, message: null }
      }

      return { success: true, error: null, message: result.message || null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${decision} request`,
        message: null,
      }
    }
  }, [venueId])

  return {
    ...state,
    refetch,
    approveInsurance,
    decideRequest,
  }
}
