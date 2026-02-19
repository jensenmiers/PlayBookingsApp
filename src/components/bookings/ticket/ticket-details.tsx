'use client'

import { GoogleMapsLink } from '@/components/venue/shared/google-maps-link'
import type { Booking, Venue } from '@/types'
import type { TicketState } from './ticket-utils'

interface TicketDetailsProps {
  booking: Booking
  venue: Venue | null
  showAmount: TicketState['showAmount']
}

export function TicketDetails({ booking, venue, showAmount }: TicketDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Venue location */}
      {venue && (
        <div>
          <p className="text-secondary-50/40 text-xs uppercase tracking-widest font-medium mb-1.5">
            Venue
          </p>
          <GoogleMapsLink
            address={venue.address}
            city={venue.city}
            state={venue.state}
            zipCode={venue.zip_code}
            variant="pill"
            showArrow
          />
        </div>
      )}

      {/* Amount */}
      <div>
        <p className="text-secondary-50/40 text-xs uppercase tracking-widest font-medium mb-1">
          Total
        </p>
        {showAmount === 'prominent' ? (
          <p className="font-mono text-3xl text-primary-400 font-bold">
            ${booking.total_amount.toFixed(2)}
          </p>
        ) : (
          <p className="font-mono text-lg text-secondary-50/60">
            ${booking.total_amount.toFixed(2)} paid
          </p>
        )}
      </div>

      {/* Notes */}
      {booking.notes && (
        <div>
          <p className="text-secondary-50/40 text-xs uppercase tracking-widest font-medium mb-1">
            Notes
          </p>
          <p className="text-secondary-50/70 text-sm">{booking.notes}</p>
        </div>
      )}
    </div>
  )
}
