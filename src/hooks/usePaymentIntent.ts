/**
 * React Hooks for creating Stripe PaymentIntents and SetupIntents
 */

'use client'

import { useState, useCallback } from 'react'

interface PaymentIntentData {
  clientSecret: string
  paymentId: string
  amount: number
}

interface SetupIntentData {
  clientSecret: string
  paymentId: string
  amount: number
  setupIntentId: string
}

interface UsePaymentIntentState {
  data: PaymentIntentData | null
  loading: boolean
  error: string | null
}

export function useCreatePaymentIntent() {
  const [state, setState] = useState<UsePaymentIntentState>({
    data: null,
    loading: false,
    error: null,
  })

  const createIntent = useCallback(async (bookingId: string): Promise<{
    data: PaymentIntentData | null
    error: string | null
  }> => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Failed to create payment intent'
        setState({ data: null, loading: false, error: message })
        return { data: null, error: message }
      }

      const intentData: PaymentIntentData = {
        clientSecret: result.data.client_secret,
        paymentId: result.data.payment_id,
        amount: result.data.amount,
      }

      setState({ data: intentData, loading: false, error: null })
      return { data: intentData, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create payment intent'
      setState({ data: null, loading: false, error: message })
      return { data: null, error: message }
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    createIntent,
    reset,
  }
}

interface UseSetupIntentState {
  data: SetupIntentData | null
  loading: boolean
  error: string | null
}

/**
 * Hook for creating Stripe SetupIntents (card-on-file for deferred payment)
 */
export function useCreateSetupIntent() {
  const [state, setState] = useState<UseSetupIntentState>({
    data: null,
    loading: false,
    error: null,
  })

  const createSetupIntent = useCallback(async (bookingId: string): Promise<{
    data: SetupIntentData | null
    error: string | null
  }> => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await fetch('/api/payments/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Failed to create setup intent'
        setState({ data: null, loading: false, error: message })
        return { data: null, error: message }
      }

      const intentData: SetupIntentData = {
        clientSecret: result.data.client_secret,
        paymentId: result.data.payment_id,
        amount: result.data.amount,
        setupIntentId: result.data.setup_intent_id,
      }

      setState({ data: intentData, loading: false, error: null })
      return { data: intentData, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create setup intent'
      setState({ data: null, loading: false, error: message })
      return { data: null, error: message }
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    createSetupIntent,
    reset,
  }
}

/**
 * Hook for deleting unpaid bookings (payment abandonment)
 */
export function useDeleteUnpaidBooking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteBooking = useCallback(async (bookingId: string): Promise<{
    success: boolean
    error: string | null
  }> => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/bookings/${bookingId}?hard=true`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Failed to delete booking'
        setError(message)
        setLoading(false)
        return { success: false, error: message }
      }

      setLoading(false)
      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete booking'
      setError(message)
      setLoading(false)
      return { success: false, error: message }
    }
  }, [])

  return {
    loading,
    error,
    deleteBooking,
  }
}
