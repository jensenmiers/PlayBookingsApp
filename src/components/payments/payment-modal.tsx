/**
 * Payment Modal Component
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreatePaymentIntent } from '@/hooks/usePaymentIntent'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentModalProps {
  bookingId: string
  amount: number
  venueName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function PaymentForm({
  amount,
  venueName,
  onSuccess,
  onCancel,
}: {
  amount: number
  venueName: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success`,
      },
      redirect: 'if_required',
    })

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setErrorMessage(error.message || 'Payment failed')
      } else {
        setErrorMessage('An unexpected error occurred')
      }
      setIsProcessing(false)
    } else {
      onSuccess()
    }
  }, [stripe, elements, onSuccess])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">Booking at</p>
        <p className="text-lg font-medium text-secondary-800">{venueName}</p>
        <p className="text-2xl font-bold text-primary mt-2">
          ${amount.toFixed(2)}
        </p>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div className="text-red-600 text-sm text-center p-2 bg-red-50 rounded-lg">
          {errorMessage}
        </div>
      )}

      <DialogFooter className="flex gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function PaymentModal({
  bookingId,
  amount,
  venueName,
  open,
  onOpenChange,
  onSuccess,
}: PaymentModalProps) {
  const { createIntent, loading: intentLoading, error: intentError, reset } = useCreatePaymentIntent()
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    if (open && !clientSecret && !intentLoading) {
      createIntent(bookingId).then(result => {
        if (result.data) {
          setClientSecret(result.data.clientSecret)
        }
      })
    }
  }, [open, bookingId, clientSecret, intentLoading, createIntent])

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      reset()
    }
  }, [open, reset])

  const handleSuccess = useCallback(() => {
    onOpenChange(false)
    onSuccess()
  }, [onOpenChange, onSuccess])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Enter your payment details to confirm your booking
          </DialogDescription>
        </DialogHeader>

        {intentLoading && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Preparing payment...</p>
          </div>
        )}

        {intentError && (
          <div className="py-4 text-center">
            <p className="text-red-600 text-sm">{intentError}</p>
            <Button
              variant="outline"
              onClick={() => createIntent(bookingId)}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}

        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#0066cc',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm
              amount={amount}
              venueName={venueName}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}
