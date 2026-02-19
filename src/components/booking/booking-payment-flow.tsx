/**
 * Unified Booking Payment Flow Component
 * Handles booking creation and payment collection in a single flow.
 * Supports two variants:
 * - 'inline': Payment form embedded in the same dialog after confirmation
 * - 'wizard': Multi-step wizard with clear progress indication
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faArrowLeft, faCheck, faCreditCard, faCalendarCheck } from '@fortawesome/free-solid-svg-icons'
import { useCreateBooking } from '@/hooks/useBookings'
import { useCreatePaymentIntent, useCreateSetupIntent, useDeleteUnpaidBooking } from '@/hooks/usePaymentIntent'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useToast } from '@/components/ui/use-toast'
import { formatTime } from '@/utils/dateHelpers'
import type { Venue, BookingWithPaymentInfo } from '@/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export interface BookingPaymentFlowProps {
  venue: Venue
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM:SS format
  endTime: string // HH:MM:SS format
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (bookingId: string) => void
  variant: 'inline' | 'wizard'
}

type FlowStep = 'details' | 'payment' | 'success'

/**
 * Parse a date string (YYYY-MM-DD) as local midnight to avoid UTC timezone issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Calculate duration in hours between two time strings (HH:MM:SS)
 */
function calculateDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return (endMinutes - startMinutes) / 60
}

/**
 * Stripe Payment Form Component
 */
function StripePaymentForm({
  amount,
  venueName,
  isSetupIntent,
  onSuccess,
  onCancel,
  onBack,
  showBackButton,
}: {
  amount: number
  venueName: string
  isSetupIntent: boolean
  onSuccess: () => void
  onCancel: () => void
  onBack?: () => void
  showBackButton?: boolean
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

    if (isSetupIntent) {
      // For setup intent, we confirm the setup (card authorization without charge)
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/success`,
        },
        redirect: 'if_required',
      })

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'Card authorization failed')
        } else {
          setErrorMessage('An unexpected error occurred')
        }
        setIsProcessing(false)
      } else {
        onSuccess()
      }
    } else {
      // For payment intent, we confirm and charge immediately
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
    }
  }, [stripe, elements, isSetupIntent, onSuccess])

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-center gap-2 sm:flex-col sm:gap-1 sm:text-center">
        <p className="text-sm font-medium text-secondary-50">{venueName}</p>
        <span className="text-muted-foreground sm:hidden">·</span>
        <p className="text-lg font-bold text-primary sm:text-2xl">
          ${amount.toFixed(2)}
        </p>
      </div>
      {isSetupIntent && (
        <p className="hidden sm:block text-xs text-muted-foreground text-center -mt-1">
          Your card will be charged after approval
        </p>
      )}

      <PaymentElement
        options={{
          layout: 'accordion',  // More compact for mobile
        }}
      />

      {errorMessage && (
        <div className="text-destructive text-sm text-center p-2 bg-destructive/15 rounded-lg">
          {errorMessage}
        </div>
      )}

      <DialogFooter className="flex gap-2 sm:gap-3 sm:flex-row">
        {showBackButton && onBack ? (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
            className="flex-1"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Processing...
            </>
          ) : isSetupIntent ? (
            'Authorize Card'
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Booking Details View Component
 */
function BookingDetailsView({
  venue,
  displayDate,
  startTime,
  endTime,
  durationHours,
  estimatedTotal,
  isLoading,
  error,
  onConfirm,
  onCancel,
  variant,
}: {
  venue: Venue
  displayDate: string
  startTime: string
  endTime: string
  durationHours: number
  estimatedTotal: number
  isLoading: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
  variant: 'inline' | 'wizard'
}) {
  return (
    <>
      <div className="space-y-4 py-4">
        {/* Venue Info */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-secondary-50">Venue</p>
          <p className="text-sm text-secondary-50/60">{venue.name}</p>
          <p className="text-xs text-secondary-50/50">
            {venue.city}, {venue.state}
          </p>
        </div>

        {/* Date & Time */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-secondary-50">Date & Time</p>
          <p className="text-sm text-secondary-50/60">{displayDate}</p>
          <p className="text-sm text-secondary-50/60">
            {formatTime(startTime)} - {formatTime(endTime)}
          </p>
        </div>

        {/* Pricing */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-secondary-50">Pricing</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-secondary-50/60">
              ${venue.hourly_rate}/hr × {durationHours} hour{durationHours !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-medium text-secondary-50">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-secondary-50/10">
            <span className="text-sm font-semibold text-secondary-50">Total</span>
            <span className="text-base font-bold text-secondary-50">
              ${estimatedTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Info Notice */}
        <div className="p-3 bg-primary-400/15 border border-primary-400/30 rounded-lg">
          <p className="text-xs text-primary-400">
            <FontAwesomeIcon icon={faCreditCard} className="mr-1" />
            <span className="font-semibold">Payment Required:</span>{' '}
            {venue.instant_booking && !venue.insurance_required
              ? 'Your card will be charged immediately to confirm this booking.'
              : 'Your card will be authorized now and charged after approval.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-primary-400 text-secondary-900 hover:bg-primary-500"
        >
          {isLoading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Creating...
            </>
          ) : variant === 'wizard' ? (
            'Continue to Payment'
          ) : (
            'Continue to Payment'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Step Indicator for Wizard Variant
 */
function StepIndicator({ currentStep }: { currentStep: FlowStep }) {
  const steps = [
    { key: 'details', label: 'Details', icon: faCalendarCheck },
    { key: 'payment', label: 'Payment', icon: faCreditCard },
  ]

  const currentIndex = currentStep === 'details' ? 0 : currentStep === 'payment' ? 1 : 2

  return (
    <div className="hidden sm:flex items-center justify-center gap-2 mb-4">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index < currentIndex
                ? 'bg-primary-400 text-secondary-900'
                : index === currentIndex
                ? 'bg-primary-400 text-secondary-900'
                : 'bg-secondary-50/10 text-secondary-50/50'
            }`}
          >
            {index < currentIndex ? (
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
            ) : (
              <FontAwesomeIcon icon={step.icon} className="w-4 h-4" />
            )}
          </div>
          <span
            className={`ml-2 text-sm ${
              index <= currentIndex ? 'text-secondary-50 font-medium' : 'text-secondary-400'
            }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-primary-400' : 'bg-secondary-50/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Main Booking Payment Flow Component
 */
export function BookingPaymentFlow({
  venue,
  date,
  startTime,
  endTime,
  open,
  onOpenChange,
  onSuccess,
  variant,
}: BookingPaymentFlowProps) {
  const [step, setStep] = useState<FlowStep>('details')
  const [booking, setBooking] = useState<BookingWithPaymentInfo | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isSetupIntent, setIsSetupIntent] = useState(false)

  const createBooking = useCreateBooking()
  const { createIntent, loading: intentLoading, error: intentError, reset: resetIntent } = useCreatePaymentIntent()
  const { createSetupIntent, loading: setupLoading, error: setupError, reset: resetSetup } = useCreateSetupIntent()
  const { deleteBooking } = useDeleteUnpaidBooking()
  const { user } = useCurrentUser()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()

  const displayDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')
  const durationHours = calculateDurationHours(startTime, endTime)
  const estimatedTotal = venue.hourly_rate * durationHours

  // Determine if this venue requires immediate payment or deferred (setup intent)
  const requiresImmediatePayment = venue.instant_booking && !venue.insurance_required

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Cleanup: if booking was created but payment not completed, delete it
      if (booking && step === 'payment') {
        deleteBooking(booking.id)
      }
      
      setStep('details')
      setBooking(null)
      setClientSecret(null)
      setIsSetupIntent(false)
      createBooking.reset()
      resetIntent()
      resetSetup()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle booking creation and payment intent setup
  const handleConfirmDetails = useCallback(async () => {
    if (!user) {
      openAuthModal({ contextMessage: 'Sign in to complete your booking' })
      return
    }

    // Create the booking
    const result = await createBooking.mutate({
      venue_id: venue.id,
      date,
      start_time: startTime,
      end_time: endTime,
      recurring_type: 'none',
    })

    if (result.data) {
      setBooking(result.data)

      // Create payment/setup intent based on venue configuration
      if (requiresImmediatePayment) {
        // Immediate payment - create PaymentIntent
        const intentResult = await createIntent(result.data.id)
        if (intentResult.data) {
          setClientSecret(intentResult.data.clientSecret)
          setIsSetupIntent(false)
          setStep('payment')
        }
      } else {
        // Deferred payment - create SetupIntent
        const setupResult = await createSetupIntent(result.data.id)
        if (setupResult.data) {
          setClientSecret(setupResult.data.clientSecret)
          setIsSetupIntent(true)
          setStep('payment')
        }
      }
    }
  }, [
    user, openAuthModal, createBooking, venue.id, date, startTime, endTime,
    requiresImmediatePayment, createIntent, createSetupIntent
  ])

  const handlePaymentSuccess = useCallback(() => {
    if (booking) {
      toast({
        title: isSetupIntent ? 'Card authorized!' : 'Payment successful!',
        description: isSetupIntent 
          ? `Your booking at ${venue.name} is pending approval. You'll be charged once approved.`
          : `Your booking at ${venue.name} is confirmed!`,
        variant: 'success',
      })
      onSuccess(booking.id)
      onOpenChange(false)
    }
  }, [booking, venue.name, isSetupIntent, toast, onSuccess, onOpenChange])

  const handleCancel = useCallback(() => {
    // If booking was created, delete it
    if (booking) {
      deleteBooking(booking.id)
    }
    onOpenChange(false)
  }, [booking, deleteBooking, onOpenChange])

  const handleBack = useCallback(() => {
    // If we're on payment step with a booking, delete it and go back
    if (booking) {
      deleteBooking(booking.id)
      setBooking(null)
      setClientSecret(null)
    }
    setStep('details')
    resetIntent()
    resetSetup()
  }, [booking, deleteBooking, resetIntent, resetSetup])

  const isCreatingBooking = createBooking.loading
  const isCreatingIntent = intentLoading || setupLoading
  const combinedError = createBooking.error || intentError || setupError

  // Calculate dialog title based on step and variant
  const getDialogTitle = () => {
    if (variant === 'wizard') {
      return step === 'details' ? 'Booking Details' : 'Payment'
    }
    return step === 'details' ? 'Confirm Your Booking' : 'Complete Payment'
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="p-4 sm:p-8 gap-3 sm:gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          {step === 'payment' && (
            <DialogDescription>
              {isSetupIntent
                ? 'Authorize your card to complete the booking request'
                : 'Enter your payment details to confirm your booking'}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Step Indicator for Wizard Variant */}
        {variant === 'wizard' && <StepIndicator currentStep={step} />}

        {/* Details Step */}
        {step === 'details' && (
          <BookingDetailsView
            venue={venue}
            displayDate={displayDate}
            startTime={startTime}
            endTime={endTime}
            durationHours={durationHours}
            estimatedTotal={estimatedTotal}
            isLoading={isCreatingBooking || isCreatingIntent}
            error={combinedError}
            onConfirm={handleConfirmDetails}
            onCancel={handleCancel}
            variant={variant}
          />
        )}

        {/* Payment Step - Loading */}
        {step === 'payment' && !clientSecret && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Preparing payment...</p>
          </div>
        )}

        {/* Payment Step - Form */}
        {step === 'payment' && clientSecret && (
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
            <StripePaymentForm
              amount={estimatedTotal}
              venueName={venue.name}
              isSetupIntent={isSetupIntent}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
              onBack={variant === 'wizard' ? handleBack : undefined}
              showBackButton={variant === 'wizard'}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  )
}
