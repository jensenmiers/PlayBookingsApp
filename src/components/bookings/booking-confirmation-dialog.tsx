/**
 * Booking Confirmation Dialog Component
 * Shows booking summary before final confirmation
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faClock, faDollarSign, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'
import { format } from 'date-fns'
import type { Venue, CreateBookingInput } from '@/types'

interface BookingConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingData: CreateBookingInput
  venue: Venue | null
  onConfirm: () => void
  loading?: boolean
  totalAmount?: number
}

export function BookingConfirmationDialog({
  open,
  onOpenChange,
  bookingData,
  venue,
  onConfirm,
  loading = false,
  totalAmount,
}: BookingConfirmationDialogProps) {
  const bookingDate = bookingData.date ? new Date(bookingData.date) : null
  const startTime = bookingData.start_time?.slice(0, 5) || ''
  const endTime = bookingData.end_time?.slice(0, 5) || ''

  // Calculate duration in hours
  const calculateDuration = () => {
    if (!bookingData.start_time || !bookingData.end_time) return 0
    const start = new Date(`2000-01-01T${bookingData.start_time}`)
    const end = new Date(`2000-01-01T${bookingData.end_time}`)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  const duration = calculateDuration()
  const calculatedTotal = venue ? duration * venue.hourly_rate : 0
  const finalAmount = totalAmount || calculatedTotal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription>
            Please review your booking details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Venue Info */}
          {venue && (
            <div className="rounded-lg border border-border bg-primary-50 p-4">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
                <span className="text-sm font-medium">Venue</span>
              </div>
              <p className="text-lg font-semibold text-primary-800">{venue.name}</p>
              <p className="text-sm text-primary-600 mt-1">
                {venue.address}, {venue.city}, {venue.state}
              </p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid gap-4 md:grid-cols-2">
            {bookingDate && (
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-primary-600 mb-2">
                  <FontAwesomeIcon icon={faCalendarDays} />
                  <span className="text-sm font-medium">Date</span>
                </div>
                <p className="text-lg font-semibold text-primary-800">
                  {format(bookingDate, 'MMMM d, yyyy')}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <FontAwesomeIcon icon={faClock} />
                <span className="text-sm font-medium">Time</span>
              </div>
              <p className="text-lg font-semibold text-primary-800">
                {startTime} - {endTime}
              </p>
              <p className="text-xs text-primary-600 mt-1">{duration} hour(s)</p>
            </div>
          </div>

          {/* Pricing */}
          {venue && (
            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center gap-2 text-primary-600 mb-2">
                <FontAwesomeIcon icon={faDollarSign} />
                <span className="text-sm font-medium">Pricing</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Hourly Rate:</span>
                  <span className="font-medium">${venue.hourly_rate}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-600">Duration:</span>
                  <span className="font-medium">{duration} hour(s)</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-primary-800">Total Amount:</span>
                    <span className="font-bold text-lg text-primary-800">
                      ${finalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recurring Info */}
          {bookingData.recurring_type !== 'none' && (
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-medium text-primary-600 mb-1">Recurring Booking</p>
              <p className="text-primary-800">
                {bookingData.recurring_type === 'weekly' ? 'Weekly' : 'Monthly'} recurring
                {bookingData.recurring_end_date && (
                  <> until {format(new Date(bookingData.recurring_end_date), 'MMMM d, yyyy')}</>
                )}
              </p>
            </div>
          )}

          {/* Notes */}
          {bookingData.notes && (
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-sm font-medium text-primary-600 mb-1">Notes</p>
              <p className="text-primary-800">{bookingData.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


