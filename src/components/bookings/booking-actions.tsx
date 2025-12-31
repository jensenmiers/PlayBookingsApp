/**
 * Booking Actions Component
 * Action buttons for booking operations (cancel, confirm, etc.)
 */

'use client'

import { useState } from 'react'
import { useCancelBooking, useConfirmBooking } from '@/hooks/useBookings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faXmark, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'

interface BookingActionsProps {
  booking: Booking
  isRenter: boolean
  isVenueOwner: boolean
  isAdmin: boolean
  onActionComplete?: () => void
  className?: string
}

export function BookingActions({
  booking,
  isRenter,
  isVenueOwner,
  isAdmin,
  onActionComplete,
  className,
}: BookingActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const cancelBooking = useCancelBooking()
  const confirmBooking = useConfirmBooking()

  const canCancel =
    (isRenter || isAdmin) &&
    (booking.status === 'pending' || booking.status === 'confirmed')
  const canConfirm = isVenueOwner && booking.status === 'pending'

  const handleCancel = async () => {
    const result = await cancelBooking.mutate(booking.id, cancelReason || undefined)
    if (result) {
      setShowCancelDialog(false)
      setCancelReason('')
      onActionComplete?.()
    }
  }

  const handleConfirm = async () => {
    const result = await confirmBooking.mutate(booking.id)
    if (result) {
      onActionComplete?.()
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {canCancel && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCancelDialog(true)}
            disabled={cancelBooking.loading}
            className="text-destructive hover:text-destructive"
          >
            <FontAwesomeIcon icon={faXmark} className="mr-2" />
            Cancel
          </Button>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Booking</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cancel-reason" className="text-sm font-medium">
                    Reason (Optional)
                  </label>
                  <Input
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter cancellation reason..."
                    className="mt-2"
                  />
                </div>
                {cancelBooking.error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {cancelBooking.error}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false)
                    setCancelReason('')
                  }}
                  disabled={cancelBooking.loading}
                >
                  Keep Booking
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelBooking.loading}
                >
                  {cancelBooking.loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTrash} className="mr-2" />
                      Cancel Booking
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {canConfirm && (
        <Button
          variant="default"
          size="sm"
          onClick={handleConfirm}
          disabled={confirmBooking.loading}
        >
          {confirmBooking.loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
              Confirming...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              Confirm
            </>
          )}
        </Button>
      )}

      {confirmBooking.error && (
        <div className="text-sm text-destructive">{confirmBooking.error}</div>
      )}
    </div>
  )
}


