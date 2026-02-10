/**
 * Slot Booking Confirmation Component
 * Wrapper around BookingPaymentFlow for slot-based booking from availability view
 * Uses the 'wizard' variant for stepped multi-step experience
 */

'use client'

import { BookingPaymentFlow } from './booking-payment-flow'
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

export function SlotBookingConfirmation({
  open,
  onOpenChange,
  venue,
  date,
  startTime,
  endTime,
  onSuccess,
}: SlotBookingConfirmationProps) {
  const handleSuccess = (bookingId: string) => {
    onSuccess?.(bookingId)
  }

  return (
    <BookingPaymentFlow
      venue={venue}
      date={date}
      startTime={startTime}
      endTime={endTime}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={handleSuccess}
      variant="wizard"
    />
  )
}
