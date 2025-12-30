'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Venue } from '@/types'
import { format } from 'date-fns'

interface TimeSlot {
  start: string
  end: string
  display: string
}

interface TimeSlotConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue | null
  date: Date
  timeSlot: TimeSlot | null
  onConfirm: () => void
}

export function TimeSlotConfirmationDialog({
  open,
  onOpenChange,
  venue,
  date,
  timeSlot,
  onConfirm,
}: TimeSlotConfirmationDialogProps) {
  if (!venue || !timeSlot) return null

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const hourlyRate = venue.hourly_rate
  const estimatedTotal = hourlyRate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Venue Info */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary-800">Venue</p>
            <p className="text-sm text-primary-600">{venue.name}</p>
            <p className="text-xs text-primary-500">
              {venue.city}, {venue.state}
            </p>
          </div>

          {/* Date & Time */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary-800">Date & Time</p>
            <p className="text-sm text-primary-600">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm text-primary-600">
              {formatTime(timeSlot.start)} - {formatTime(timeSlot.end)}
            </p>
          </div>

          {/* Pricing */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary-800">Pricing</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-600">Hourly Rate (1 hour)</span>
              <span className="text-sm font-medium text-primary-800">${hourlyRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-primary-200">
              <span className="text-sm font-semibold text-primary-800">Estimated Total</span>
              <span className="text-base font-bold text-primary-900">
                ${estimatedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Instant Booking Notice */}
          {!venue.instant_booking && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Approval Required:</span> This booking requires
                venue owner approval. You'll be notified once it's confirmed.
              </p>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

