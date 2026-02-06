/**
 * React Hook for creating Stripe PaymentIntents
 */

'use client'

import { useState, useCallback } from 'react'

interface PaymentIntentData {
  clientSecret: string
  paymentId: string
  amount: number
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
