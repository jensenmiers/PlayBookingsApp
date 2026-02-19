'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCreditCard, faCalendarPlus, faRotateRight, faShield } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { BookingActions } from '@/components/bookings/booking-actions'
import { GoogleMapsLink } from '@/components/venue/shared/google-maps-link'
import { slugify } from '@/lib/utils'
import { timeStringToDate } from '@/utils/dateHelpers'
import type { Booking, Venue } from '@/types'
import type { TicketState } from './ticket-utils'

interface TicketActionsProps {
  booking: Booking
  venue: Venue | null
  ticketState: TicketState
  isRenter: boolean
  isVenueOwner: boolean
  isAdmin: boolean
  onPayClick: () => void
  onActionComplete?: () => void
}

function formatGcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function TicketActions({
  booking,
  venue,
  ticketState,
  isRenter,
  isVenueOwner,
  isAdmin,
  onPayClick,
  onActionComplete,
}: TicketActionsProps) {
  const handleAddToCalendar = () => {
    const start = timeStringToDate(booking.date, booking.start_time)
    const end = timeStringToDate(booking.date, booking.end_time)
    const title = `Court Booking — ${venue?.name || 'Venue'}`
    const location = venue
      ? `${venue.address}, ${venue.city}, ${venue.state} ${venue.zip_code}`
      : ''

    const gcalUrl = new URL('https://calendar.google.com/calendar/render')
    gcalUrl.searchParams.set('action', 'TEMPLATE')
    gcalUrl.searchParams.set('text', title)
    gcalUrl.searchParams.set('dates', `${formatGcalDate(start)}/${formatGcalDate(end)}`)
    gcalUrl.searchParams.set('location', location)

    window.open(gcalUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-3">
      {/* Insurance gate message */}
      {ticketState.insuranceGated && (
        <div className="flex items-start gap-3 p-4 bg-accent-400/5 rounded-xl border border-accent-400/10">
          <FontAwesomeIcon icon={faShield} className="text-accent-400 mt-0.5" />
          <div>
            <p className="text-secondary-50 font-medium text-sm">Insurance Required</p>
            <p className="text-secondary-50/50 text-xs mt-0.5">
              Your insurance must be verified before you can pay for this booking.
            </p>
          </div>
        </div>
      )}

      {/* Primary CTA */}
      {ticketState.primaryAction === 'pay' && (
        <Button onClick={onPayClick} size="lg" className="w-full">
          <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
          Pay ${booking.total_amount.toFixed(2)}
        </Button>
      )}

      {ticketState.primaryAction === 'directions' && venue && (
        <GoogleMapsLink
          address={venue.address}
          city={venue.city}
          state={venue.state}
          zipCode={venue.zip_code}
          variant="default"
          showArrow
          className="w-full justify-center h-12 px-6 bg-primary text-primary-foreground rounded-full font-semibold shadow-soft hover:opacity-90 transition-opacity"
        />
      )}

      {ticketState.primaryAction === 'book-again' && venue && (
        <Link href={`/venue/${slugify(venue.name)}`} className="block">
          <Button size="lg" className="w-full">
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            Book Again
          </Button>
        </Link>
      )}

      {ticketState.primaryAction === 'waiting' && (
        <div className="text-center py-3 text-secondary-50/40 text-sm">
          Awaiting owner confirmation...
        </div>
      )}

      {/* Add to Calendar — confirmed, upcoming bookings */}
      {booking.status === 'confirmed' && !ticketState.isPast && (
        <Button variant="outline" size="lg" className="w-full" onClick={handleAddToCalendar}>
          <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
          Add to Calendar
        </Button>
      )}

      {/* Cancel / Confirm — delegates to existing BookingActions */}
      {(ticketState.canCancel || (isVenueOwner && booking.status === 'pending')) && (
        <BookingActions
          booking={booking}
          isRenter={isRenter}
          isVenueOwner={isVenueOwner}
          isAdmin={isAdmin}
          onActionComplete={onActionComplete}
          className="flex-col w-full [&>button]:w-full [&>button]:h-12 [&>button]:justify-center"
        />
      )}
    </div>
  )
}
