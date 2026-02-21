/**
 * Slot Booking Confirmation Component
 * Wrapper around BookingPaymentFlow for slot-based booking from availability view
 * Uses the 'wizard' variant for stepped multi-step experience
 */

'use client'

import { useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { BookingPaymentFlow } from './booking-payment-flow'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/utils/dateHelpers'
import type { SlotActionType, SlotModalContent, Venue } from '@/types'

interface SlotBookingConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM:SS format
  endTime: string // HH:MM:SS format
  slotActionType?: SlotActionType
  slotInstanceId?: string | null
  slotModalContent?: SlotModalContent | null
  onSuccess?: (bookingId: string) => void
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function InfoOnlySlotDialog({
  open,
  onOpenChange,
  venue,
  date,
  startTime,
  endTime,
  modalContent,
  onModalOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue
  date: string
  startTime: string
  endTime: string
  modalContent?: SlotModalContent | null
  onModalOpen: () => void
}) {
  useEffect(() => {
    if (open) {
      onModalOpen()
    }
  }, [open, onModalOpen])

  const content: SlotModalContent = modalContent || {
    title: 'Open Gym Session',
    body: 'This session is a drop-in open gym. Payment is done on site.',
    bullet_points: ['No reservation is required for this time slot.'],
    cta_label: 'Got it',
  }

  const displayDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-secondary-50">Venue</p>
            <p className="text-sm text-secondary-50/70">{venue.name}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-secondary-50">Date & Time</p>
            <p className="text-sm text-secondary-50/70">{displayDate}</p>
            <p className="text-sm text-secondary-50/70">
              {formatTime(startTime)} - {formatTime(endTime)}
            </p>
          </div>

          {content.bullet_points && content.bullet_points.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-secondary-50/70">
              {content.bullet_points.map((point, idx) => (
                <li key={`${point}-${idx}`}>{point}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            {content.cta_label || 'Got it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SlotBookingConfirmation({
  open,
  onOpenChange,
  venue,
  date,
  startTime,
  endTime,
  slotActionType = venue.instant_booking ? 'instant_book' : 'request_private',
  slotInstanceId = null,
  slotModalContent = null,
  onSuccess,
}: SlotBookingConfirmationProps) {
  const handleSuccess = (bookingId: string) => {
    onSuccess?.(bookingId)
  }

  const logInfoModalOpen = useCallback(() => {
    if (slotActionType !== 'info_only_open_gym') {
      return
    }
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return
    }

    const endpoint = new URL('/api/slot-interactions', window.location.origin).toString()
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_instance_id: slotInstanceId,
        venue_id: venue.id,
        event_type: 'modal_open',
        metadata: {
          action_type: slotActionType,
          date,
          start_time: startTime,
          end_time: endTime,
        },
      }),
    }).catch(() => {
      // Non-blocking analytics/audit write.
    })
  }, [slotActionType, slotInstanceId, venue.id, date, startTime, endTime])

  if (slotActionType === 'info_only_open_gym') {
    return (
      <InfoOnlySlotDialog
        open={open}
        onOpenChange={onOpenChange}
        venue={venue}
        date={date}
        startTime={startTime}
        endTime={endTime}
        modalContent={slotModalContent}
        onModalOpen={logInfoModalOpen}
      />
    )
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
