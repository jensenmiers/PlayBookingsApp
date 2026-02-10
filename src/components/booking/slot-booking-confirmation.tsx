'use client'

import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useCreateBooking } from '@/hooks/useBookings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useToast } from '@/components/ui/use-toast'
import { formatTime } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface SlotBookingConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM:SS format
  endTime: string // HH:MM:SS format
  onSuccess?: (bookingId: string) => void
}

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

export function SlotBookingConfirmation({
  open,
  onOpenChange,
  venue,
  date,
  startTime,
  endTime,
  onSuccess,
}: SlotBookingConfirmationProps) {
  const createBooking = useCreateBooking()
  const { user } = useCurrentUser()
  const { openAuthModal } = useAuthModal()
  const { toast } = useToast()

  const handleConfirm = async () => {
    if (!user) {
      openAuthModal({ contextMessage: 'Sign in to complete your booking' })
      return
    }

    const result = await createBooking.mutate({
      venue_id: venue.id,
      date,
      start_time: startTime,
      end_time: endTime,
      recurring_type: 'none',
    })

    if (result.data) {
      toast({
        title: 'Booking confirmed!',
        description: `${venue.name} on ${displayDate}`,
        variant: 'success',
      })
      onSuccess?.(result.data.id)
      onOpenChange(false)
    }
  }

  const displayDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')
  const durationHours = calculateDurationHours(startTime, endTime)
  const estimatedTotal = venue.hourly_rate * durationHours

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Venue Info */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-secondary-800">Venue</p>
            <p className="text-sm text-secondary-600">{venue.name}</p>
            <p className="text-xs text-secondary-500">
              {venue.city}, {venue.state}
            </p>
          </div>

          {/* Date & Time */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-secondary-800">Date & Time</p>
            <p className="text-sm text-secondary-600">{displayDate}</p>
            <p className="text-sm text-secondary-600">
              {formatTime(startTime)} - {formatTime(endTime)}
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-secondary-800">Pricing</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">
                ${venue.hourly_rate}/hr × {durationHours} hour{durationHours !== 1 ? 's' : ''}
              </span>
              <span className="text-sm font-medium text-secondary-800">
                ${estimatedTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-secondary-200">
              <span className="text-sm font-semibold text-secondary-800">Estimated Total</span>
              <span className="text-base font-bold text-secondary-900">
                ${estimatedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Approval Notice */}
          {!venue.instant_booking && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Approval Required:</span> This booking requires
                venue owner approval. You&apos;ll be notified once it&apos;s confirmed.
              </p>
            </div>
          )}

          {/* Error Message */}
          {createBooking.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <p className="text-xs text-destructive">{createBooking.error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createBooking.loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={createBooking.loading}
            className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-white"
          >
            {createBooking.loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Booking...
              </>
            ) : (
              'Confirm Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
