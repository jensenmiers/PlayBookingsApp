/**
 * Create Booking Form Component
 * Form for creating new bookings with venue selection, date/time pickers, and recurring options
 */

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { createBookingSchema, type CreateBookingInput } from '@/lib/validations/booking'
import { useCreateBooking, useCheckConflicts } from '@/hooks/useBookings'
import { useVenues, useVenue } from '@/hooks/useVenues'
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
import { faCalendarDays, faClock, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import { AuthRequiredDialog } from '@/components/ui/auth-required-dialog'
import type { Venue } from '@/types'

interface CreateBookingFormProps {
  venueId?: string
  initialDate?: Date
  onSuccess?: (bookingId: string) => void
  onCancel?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateBookingForm({
  venueId: initialVenueId,
  initialDate,
  onSuccess,
  onCancel,
  open = true,
  onOpenChange,
}: CreateBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [conflictChecked, setConflictChecked] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const { data: venues, loading: venuesLoading } = useVenues()
  const { data: selectedVenue } = useVenue(initialVenueId || null)
  const createBooking = useCreateBooking()
  const { check: checkConflicts, data: conflictData, loading: checkingConflicts } = useCheckConflicts()

  const form = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      venue_id: initialVenueId || '',
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
      start_time: '09:00:00',
      end_time: '10:00:00',
      recurring_type: 'none',
      notes: '',
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

    const booking = await createBooking.mutate(data)
    if (booking) {
      onSuccess?.(booking.id)
      form.reset()
      setConflictChecked(false)
      onOpenChange?.(false)
    } else if (createBooking.error) {
      // Check if error is authentication-related
      const errorMessage = createBooking.error.toLowerCase()
      if (
        errorMessage.includes('authentication required') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('sign in')
      ) {
        setShowAuthDialog(true)
      } else {
        // Show other errors in the form
        form.setError('root', {
          message: createBooking.error,
        })
      }
    }
  }

  const hasConflict = conflictData?.hasConflict || false
  const venue = venues?.find((v) => v.id === watchedVenueId) || selectedVenue

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>

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
                      className="flex h-11 w-full rounded-lg border border-input bg-white/80 px-4 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:opacity-50"
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
                          className="pr-10"
                          onChange={(e) => {
                            field.onChange(e)
                            setConflictChecked(false)
                            if (e.target.value) {
                              setSelectedDate(new Date(e.target.value))
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
                      <div className="border rounded-lg p-4 bg-white">
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
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                <span>Checking availability...</span>
              </div>
            )}
            {hasConflict && !checkingConflicts && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
                      className="flex h-11 w-full rounded-lg border border-input bg-white/80 px-4 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
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
                      className="flex w-full rounded-lg border border-input bg-white/80 px-4 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] resize-none"
                      placeholder="Add any special requests or notes..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Message */}
            {form.formState.errors.root && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Booking Summary */}
            {venue && watchedDate && watchedStartTime && watchedEndTime && (
              <div className="rounded-lg border border-border bg-primary-50 p-4">
                <h4 className="font-semibold text-sm mb-2">Booking Summary</h4>
                <div className="space-y-1 text-sm text-primary-700">
                  <p>
                    <span className="font-medium">Venue:</span> {venue.name}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : watchedDate}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span> {watchedStartTime.slice(0, 5)} -{' '}
                    {watchedEndTime.slice(0, 5)}
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
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Booking'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Auth Required Dialog */}
    <AuthRequiredDialog
      open={showAuthDialog}
      onOpenChange={setShowAuthDialog}
    />
  </>
  )
}


