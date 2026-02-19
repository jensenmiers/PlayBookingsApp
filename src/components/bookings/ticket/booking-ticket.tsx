'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBooking } from '@/hooks/useBookings'
import { useVenue } from '@/hooks/useVenues'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCreditCard } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { PaymentModal } from '@/components/payments/payment-modal'
import { getTicketState } from './ticket-utils'
import { TicketHero } from './ticket-hero'
import { TicketStatusBanner } from './ticket-status-banner'
import { TicketDatetime } from './ticket-datetime'
import { TicketDetails } from './ticket-details'
import { TicketTearLine } from './ticket-tear-line'
import { TicketActions } from './ticket-actions'
import { TicketSkeleton } from './ticket-skeleton'

interface BookingTicketProps {
  bookingId: string
  isRenter: boolean
  isVenueOwner: boolean
  isAdmin: boolean
  onActionComplete?: () => void
}

export function BookingTicket({
  bookingId,
  isRenter,
  isVenueOwner,
  isAdmin,
  onActionComplete,
}: BookingTicketProps) {
  const router = useRouter()
  const { data: booking, loading, error } = useBooking(bookingId)
  const { data: venue } = useVenue(booking?.venue_id || null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  if (loading) return <TicketSkeleton />

  if (error || !booking) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">{error || 'Booking not found'}</p>
      </div>
    )
  }

  const ticketState = getTicketState(booking, venue)
  const openPayment = () => setPaymentModalOpen(true)

  return (
    <div className="relative">
      {/* Hero — bleeds past dashboard container */}
      <TicketHero venue={venue} onBack={() => router.push('/my-bookings')} />

      {/* Ticket card — floating over hero */}
      <div className="relative -mt-6 z-10 bg-secondary-800/90 backdrop-blur-xl rounded-2xl border border-secondary-50/10 shadow-glass mx-0 sm:mx-4 overflow-hidden">
        <div className="p-6">
          {/* Status banner */}
          <TicketStatusBanner
            statusVariant={ticketState.statusVariant}
            statusLabel={ticketState.statusLabel}
            statusDescription={ticketState.statusDescription}
          />

          {/* Date / Time — dominant element */}
          <div className="mt-6">
            <TicketDatetime
              date={booking.date}
              startTime={booking.start_time}
              endTime={booking.end_time}
              recurringType={booking.recurring_type}
              recurringEndDate={booking.recurring_end_date}
            />
          </div>

          {/* Venue, amount, notes */}
          <div className="mt-6">
            <TicketDetails
              booking={booking}
              venue={venue}
              showAmount={ticketState.showAmount}
            />
          </div>

          {/* Tear line divider */}
          <TicketTearLine />

          {/* Contextual actions */}
          <TicketActions
            booking={booking}
            venue={venue}
            ticketState={ticketState}
            isRenter={isRenter}
            isVenueOwner={isVenueOwner}
            isAdmin={isAdmin}
            onPayClick={openPayment}
            onActionComplete={onActionComplete}
          />
        </div>
      </div>

      {/* Sticky mobile pay bar */}
      {ticketState.primaryAction === 'pay' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-secondary-900/95 backdrop-blur-lg border-t border-secondary-50/10 px-4 py-3">
          <Button onClick={openPayment} size="lg" className="w-full">
            <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
            Pay ${booking.total_amount.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Spacer for mobile sticky bar */}
      {ticketState.primaryAction === 'pay' && (
        <div className="h-20 sm:hidden" />
      )}

      {/* Payment modal */}
      {venue && (
        <PaymentModal
          bookingId={booking.id}
          amount={booking.total_amount}
          venueName={venue.name}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={() => {
            setPaymentModalOpen(false)
            onActionComplete?.()
          }}
        />
      )}
    </div>
  )
}
