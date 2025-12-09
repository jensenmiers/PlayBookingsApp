/**
 * React Hooks for Booking Data Fetching and Mutations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { bookingApi } from '@/lib/api/bookings'
import type { Booking } from '@/types'
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  ListBookingsQueryParams,
  CheckConflictsRequest,
  GenerateRecurringRequest,
} from '@/types/api'

/**
 * Hook state interface
 */
interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Mutation hook state interface
 */
interface UseMutationState<T> {
  data: T | null
  loading: boolean
  error: string | null
  mutate: (...args: unknown[]) => Promise<T | null>
  reset: () => void
}

/**
 * Fetch list of bookings with filters
 */
export function useBookings(params?: ListBookingsQueryParams) {
  const [state, setState] = useState<UseAsyncState<Booking[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const fetchBookings = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await bookingApi.listBookings(params)
      setState({ data: response.data, loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch bookings'
      setState({ data: null, loading: false, error: message })
    }
  }, [params])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return {
    ...state,
    refetch: fetchBookings,
  }
}

/**
 * Fetch a single booking by ID
 */
export function useBooking(id: string | null) {
  const [state, setState] = useState<UseAsyncState<Booking>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))
    bookingApi
      .getBooking(id)
      .then((booking) => {
        setState({ data: booking, loading: false, error: null })
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to fetch booking'
        setState({ data: null, loading: false, error: message })
      })
  }, [id])

  return state
}

/**
 * Mutation hook for creating bookings
 */
export function useCreateBooking() {
  const [state, setState] = useState<Omit<UseMutationState<Booking>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(async (data: CreateBookingRequest): Promise<{ data: Booking | null; error: string | null }> => {
    setState({ data: null, loading: true, error: null })
    try {
      const booking = await bookingApi.createBooking(data)
      setState({ data: booking, loading: false, error: null })
      return { data: booking, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create booking'
      setState({ data: null, loading: false, error: message })
      return { data: null, error: message }
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}

/**
 * Mutation hook for updating bookings
 */
export function useUpdateBooking() {
  const [state, setState] = useState<Omit<UseMutationState<Booking>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (id: string, data: UpdateBookingRequest): Promise<Booking | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        const booking = await bookingApi.updateBooking(id, data)
        setState({ data: booking, loading: false, error: null })
        return booking
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update booking'
        setState({ data: null, loading: false, error: message })
        return null
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}

/**
 * Mutation hook for cancelling bookings
 */
export function useCancelBooking() {
  const [state, setState] = useState<Omit<UseMutationState<Booking>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (id: string, reason?: string): Promise<Booking | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        const booking = await bookingApi.cancelBooking(id, reason)
        setState({ data: booking, loading: false, error: null })
        return booking
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel booking'
        setState({ data: null, loading: false, error: message })
        return null
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}

/**
 * Mutation hook for confirming bookings
 */
export function useConfirmBooking() {
  const [state, setState] = useState<Omit<UseMutationState<Booking>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(async (id: string): Promise<Booking | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const booking = await bookingApi.confirmBooking(id)
      setState({ data: booking, loading: false, error: null })
      return booking
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm booking'
      setState({ data: null, loading: false, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}

/**
 * Hook for checking booking conflicts
 */
export function useCheckConflicts() {
  const [state, setState] = useState<UseAsyncState<{ hasConflict: boolean; conflictType?: string; message?: string }>>({
    data: null,
    loading: false,
    error: null,
  })

  const check = useCallback(async (data: CheckConflictsRequest) => {
    setState({ data: null, loading: true, error: null })
    try {
      const result = await bookingApi.checkConflicts(data)
      setState({ data: result, loading: false, error: null })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check conflicts'
      setState({ data: null, loading: false, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    check,
    reset,
  }
}

/**
 * Hook for generating recurring bookings
 */
export function useGenerateRecurring() {
  const [state, setState] = useState<Omit<UseMutationState<unknown[]>, 'mutate' | 'reset'>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (data: GenerateRecurringRequest): Promise<unknown[] | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        const result = await bookingApi.generateRecurring(data)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate recurring bookings'
        setState({ data: null, loading: false, error: message })
        return null
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    mutate,
    reset,
  }
}


