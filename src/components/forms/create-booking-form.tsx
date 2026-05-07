/**
 * Create Booking Form Component
 * Form for creating new bookings with venue selection, date/time pickers, and recurring options
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'

/**
 * Parse a date string (YYYY-MM-DD) as local midnight to avoid UTC timezone issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Normalize a Date to local midnight to avoid timezone issues when formatting
 */
function normalizeToLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
import { createBookingSchema, type CreateBookingInput } from '@/lib/validations/booking'
import { BOOKING_APPROVAL_COPY } from '@/lib/booking-mode'
import { formatTime } from '@/utils/dateHelpers'
import { useCreateBooking, useCheckConflicts } from '@/hooks/useBookings'
import { useCreatePaymentIntent, useCreateSetupIntent, useDeleteUnpaidBooking } from '@/hooks/usePaymentIntent'
import { useVenues, useVenue } from '@/hooks/useVenues'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { faCheck, faCreditCard, faCalendarCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useAuthModal } from '@/contexts/AuthModalContext'

interface CreateBookingFormProps {
  venueId?: string
  initialDate?: Date
  initialStartTime?: string
  initialEndTime?: string
  initialRecurringType?: CreateBookingInput['recurring_type']
  initialNotes?: string
  onSuccess?: (bookingId: string) => void
  onCancel?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateBookingForm({
  venueId: initialVenueId,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialRecurringType = 'none',
  initialNotes = '',
  onSuccess,
  onCancel,
  open = true,
  onOpenChange,
}: CreateBookingFormProps) {
  const today = new Date()
  // Normalize initialDate to local midnight to avoid timezone issues
  const defaultDate = initialDate ? normalizeToLocalMidnight(initialDate) : normalizeToLocalMidnight(today)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [conflictChecked, setConflictChecked] = useState(false)
  const { openAuthModal } = useAuthModal()

  const { data: venues, loading: venuesLoading } = useVenues()
  const { data: selectedVenue } = useVenue(initialVenueId || null)
  const createBooking = useCreateBooking()
  const { check: checkConflicts, data: conflictData, loading: checkingConflicts } = useCheckConflicts()
  
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('form')
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null)
  const [pendingBookingAmount, setPendingBookingAmount] = useState<number>(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isSetupIntent, setIsSetupIntent] = useState(false)

  const { createIntent } = useCreatePaymentIntent()
  const { createSetupIntent } = useCreateSetupIntent()
  const { deleteBooking } = useDeleteUnpaidBooking()

  // Format time to HH:MM:SS if needed
  const formatTimeForForm = (time?: string): string => {
    if (!time) return '09:00:00'
    // If time is already in HH:MM:SS format, return as is
    if (time.length === 8) return time
    // If time is in HH:MM format, add :00
    if (time.length === 5) return `${time}:00`
    return time
  }

  const form = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      venue_id: initialVenueId || '',
      date: format(defaultDate, 'yyyy-MM-dd'),
      start_time: formatTimeForForm(initialStartTime) || '09:00:00',
      end_time: formatTimeForForm(initialEndTime) || '10:00:00',
      recurring_type: initialRecurringType,
      notes: initialNotes,
    },
  })

  const watchedVenueId = form.watch('venue_id')
  const watchedDate = form.watch('date')
  const watchedStartTime = form.watch('start_time')
  const watchedEndTime = form.watch('end_time')
  const watchedRecurringType = form.watch('recurring_type')

  // Auto-check conflicts when relevant fields change
  useEffect(() => {
    if (watchedVenueId && watchedDate && watchedStartTime && watchedEndTime && !conflictChecked) {
      const checkConflict = async () => {
        await checkConflicts({
          venue_id: watchedVenueId,
          date: watchedDate,
          start_time: watchedStartTime,
          end_time: watchedEndTime,
        })
        setConflictChecked(true)
      }
      const timeoutId = setTimeout(checkConflict, 500) // Debounce
      return () => clearTimeout(timeoutId)
    }
  }, [watchedVenueId, watchedDate, watchedStartTime, watchedEndTime, conflictChecked, checkConflicts])

  // Update date when calendar selection changes
  useEffect(() => {
    if (selectedDate) {
      form.setValue('date', format(selectedDate, 'yyyy-MM-dd'))
      setConflictChecked(false)
    }
  }, [selectedDate, form])

  // Update form values when initial props change (e.g., when opening with a pre-selected slot)
  useEffect(() => {
    if (open) {
      if (initialVenueId) {
        form.setValue('venue_id', initialVenueId)
      }
      if (initialDate) {
        // Create a local date from the initialDate to avoid timezone issues
        const localDate = normalizeToLocalMidnight(initialDate)
        const dateStr = format(localDate, 'yyyy-MM-dd')
        form.setValue('date', dateStr)
        setSelectedDate(localDate)
      }
      if (initialStartTime) {
        form.setValue('start_time', formatTimeForForm(initialStartTime))
      }
      if (initialEndTime) {
        form.setValue('end_time', formatTimeForForm(initialEndTime))
      }
      form.setValue('recurring_type', initialRecurringType)
      form.setValue('notes', initialNotes)
      setConflictChecked(false)
    }
  }, [open, initialVenueId, initialDate, initialStartTime, initialEndTime, initialRecurringType, initialNotes, form])

  const onSubmit = async (data: CreateBookingInput) => {
    // Check conflicts one more time before submission
    const conflictResult = await checkConflicts({
      venue_id: data.venue_id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
    })

    if (conflictResult?.hasConflict) {
      form.setError('root', {
        message: conflictResult.message || 'This time slot conflicts with an existing booking',
      })
      return
    }

    const result = await createBooking.mutate(data)
    if (result.data) {
      if (result.data.requiresPayment === false) {
        onSuccess?.(result.data.id)
        form.reset()
        setConflictChecked(false)
        onOpenChange?.(false)
        return
      }

      // All bookings now require payment info collection
      setPendingBookingId(result.data.id)
      setPendingBookingAmount(result.data.total_amount)
      
      // Determine if immediate payment or deferred (setup intent)
      const venueData = venues?.find(v => v.id === data.venue_id)
      const requiresImmediatePayment = venueData?.instant_booking && !venueData?.insurance_required
      
      if (requiresImmediatePayment) {
        // Create PaymentIntent for immediate charge
        const intentResult = await createIntent(result.data.id)
        if (intentResult.data) {
          setClientSecret(intentResult.data.clientSecret)
          setIsSetupIntent(false)
          setCurrentStep('payment')
        }
      } else {
        // Create SetupIntent for deferred charge
        const setupResult = await createSetupIntent(result.data.id)
        if (setupResult.data) {
          setClientSecret(setupResult.data.clientSecret)
          setIsSetupIntent(true)
          setCurrentStep('payment')
        }
      }
      return
    } else if (result.error) {
      const errorMessage = result.error.toLowerCase()
      if (
        errorMessage.includes('authentication required') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('sign in')
      ) {
        const currentValues = form.getValues()
        openAuthModal({
          entryMode: 'login',
          contextMessage: 'Sign in to complete your booking',
          resumeState: {
            type: 'create-booking-form',
            venueId: currentValues.venue_id,
            date: currentValues.date,
            startTime: currentValues.start_time,
            endTime: currentValues.end_time,
            recurringType: currentValues.recurring_type ?? 'none',
            notes: currentValues.notes || '',
          },
        })
      } else {
        form.setError('root', {
          message: result.error,
        })
      }
    }
  }

  const hasConflict = conflictData?.hasConflict || false
  const venue = venues?.find((v) => v.id === watchedVenueId) || selectedVenue

  const handlePaymentSuccess = () => {
    const bookingId = pendingBookingId
    setCurrentStep('form')
    setClientSecret(null)
    setPendingBookingId(null)
    setPendingBookingAmount(0)
    setIsSetupIntent(false)
    if (bookingId) {
      onSuccess?.(bookingId)
    }
    form.reset()
    setConflictChecked(false)
    onOpenChange?.(false)
  }

  const handlePaymentCancel = () => {
    // Delete the unpaid booking
    if (pendingBookingId) {
      deleteBooking(pendingBookingId)
    }
    setCurrentStep('form')
    setClientSecret(null)
    setPendingBookingId(null)
    setPendingBookingAmount(0)
    setIsSetupIntent(false)
  }

  const handleBackToForm = () => {
    // Delete the unpaid booking and go back to form
    if (pendingBookingId) {
      deleteBooking(pendingBookingId)
    }
    setCurrentStep('form')
    setClientSecret(null)
    setPendingBookingId(null)
    setPendingBookingAmount(0)
    setIsSetupIntent(false)
  }

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && currentStep === 'payment' && pendingBookingId) {
      // User closing during payment - delete booking
      deleteBooking(pendingBookingId)
    }
    if (!isOpen) {
      setCurrentStep('form')
      setClientSecret(null)
      setPendingBookingId(null)
      setPendingBookingAmount(0)
      setIsSetupIntent(false)
    }
    onOpenChange?.(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="p-l sm:p-2xl gap-m sm:gap-xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'form' ? 'Create New Booking' : 'Complete Payment'}
          </DialogTitle>
        </DialogHeader>

        {/* Wizard Step Indicator */}
        <WizardStepIndicator currentStep={currentStep} />

        {/* Payment Step */}
        {currentStep === 'payment' && clientSecret && venue && (
          <div className="space-y-3 sm:space-y-4">
            <div className="text-center mb-s sm:mb-l">
              <p className="text-xs sm:text-sm text-muted-foreground">Booking at</p>
              <div className="flex items-center justify-center gap-s sm:flex-col sm:gap-0">
                <p className="text-base sm:text-lg font-medium text-secondary-50">{venue.name}</p>
                <span className="text-muted-foreground sm:hidden">·</span>
                <p className="text-lg sm:text-2xl font-bold text-primary sm:mt-s">
                  ${pendingBookingAmount.toFixed(2)}
                </p>
              </div>
              {isSetupIntent && (
                <p className="text-xs text-muted-foreground mt-xs">
                  {BOOKING_APPROVAL_COPY.deferredSetupSubtext}
                </p>
              )}
            </div>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: 'var(--primary-600)',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <WizardPaymentForm
                isSetupIntent={isSetupIntent}
                amount={pendingBookingAmount}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                onBack={handleBackToForm}
              />
            </Elements>
          </div>
        )}

        {/* Form Step */}
        {currentStep === 'form' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Venue Selection */}
            <FormField
              control={form.control}
              name="venue_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!!initialVenueId || venuesLoading}
                      className="flex h-11 w-full rounded-lg border border-input bg-secondary-800/80 px-l py-s text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:opacity-50"
                    >
                      <option value="">Select a venue</option>
                      {venues?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} - ${v.hourly_rate}/hr
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <div className="space-y-2">
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="date"
                          className="pr-3xl"
                          onChange={(e) => {
                            field.onChange(e)
                            setConflictChecked(false)
                            if (e.target.value) {
                              setSelectedDate(parseLocalDate(e.target.value))
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowDatePicker(!showDatePicker)}
                        >
                          <FontAwesomeIcon icon={faCalendarDays} />
                        </Button>
                      </div>
                    </FormControl>
                    {showDatePicker && (
                      <div className="border rounded-lg p-l bg-secondary-800">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date)
                            setShowDatePicker(false)
                          }}
                          disabled={(date) => date < new Date()}
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-l">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        step="3600"
                        onChange={(e) => {
                          field.onChange(e.target.value + ':00')
                          setConflictChecked(false)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        step="3600"
                        onChange={(e) => {
                          field.onChange(e.target.value + ':00')
                          setConflictChecked(false)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Conflict Warning */}
            {checkingConflicts && (
              <div className="flex items-center gap-s text-sm text-secondary-50/60">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                <span>Checking availability...</span>
              </div>
            )}
            {hasConflict && !checkingConflicts && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-m text-sm text-destructive">
                {conflictData?.message || 'This time slot conflicts with an existing booking'}
              </div>
            )}

            {/* Recurring Options */}
            <FormField
              control={form.control}
              name="recurring_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurring Booking</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-11 w-full rounded-lg border border-input bg-secondary-800/80 px-l py-s text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
                    >
                      <option value="none">One-time booking</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    {watchedRecurringType === 'weekly' && 'Bookings will repeat every week'}
                    {watchedRecurringType === 'monthly' && 'Bookings will repeat every month'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRecurringType !== 'none' && (
              <FormField
                control={form.control}
                name="recurring_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurring End Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        min={watchedDate}
                        onChange={(e) => {
                          field.onChange(e)
                          setConflictChecked(false)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Last date for recurring bookings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={3}
                      className="flex w-full rounded-lg border border-input bg-secondary-800/80 px-l py-s text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] resize-none"
                      placeholder="Add any special requests or notes..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Message */}
            {form.formState.errors.root && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-m text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Booking Summary */}
            {venue && watchedDate && watchedStartTime && watchedEndTime && (
              <div className="rounded-lg border border-border bg-background p-l">
                <h4 className="font-semibold text-sm mb-s">Booking Summary</h4>
                <div className="space-y-1 text-sm text-secondary-50/70">
                  <p>
                    <span className="font-medium">Venue:</span> {venue.name}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : watchedDate}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span> {formatTime(watchedStartTime)} -{' '}
                    {formatTime(watchedEndTime)}
                  </p>
                  <p>
                    <span className="font-medium">Rate:</span> ${venue.hourly_rate}/hour
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onCancel?.()
                  onOpenChange?.(false)
                }}
                disabled={createBooking.loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBooking.loading || hasConflict || checkingConflicts}
              >
                {createBooking.loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-s" />
                    Creating...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Wizard Step Indicator Component
 */
function WizardStepIndicator({ currentStep }: { currentStep: 'form' | 'payment' }) {
  const steps = [
    { key: 'form', label: 'Booking Details', icon: faCalendarCheck },
    { key: 'payment', label: 'Payment', icon: faCreditCard },
  ]

  const currentIndex = currentStep === 'form' ? 0 : 1

  return (
    <div className="flex items-center justify-center gap-s mb-s sm:mb-l pb-s sm:pb-l border-b border-secondary-50/10">
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
            className={`ml-s text-sm ${
              index <= currentIndex ? 'text-secondary-50 font-medium' : 'text-secondary-400'
            }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-m ${
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
 * Wizard Payment Form Component
 */
function WizardPaymentForm({
  isSetupIntent,
  amount,
  onSuccess,
  onCancel,
  onBack,
}: {
  isSetupIntent: boolean
  amount: number
  onSuccess: () => void
  onCancel: () => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    if (isSetupIntent) {
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'accordion',  // More compact for mobile
        }}
      />

      {errorMessage && (
        <div className="text-destructive text-sm text-center p-s bg-destructive/15 rounded-lg">
          {errorMessage}
        </div>
      )}

      <DialogFooter className="flex gap-m sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-s" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-s" />
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
