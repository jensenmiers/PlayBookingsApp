/**
 * Booking Details Component
 * Display detailed booking information
 */

'use client'

import { useBooking } from '@/hooks/useBookings'
import { useVenue } from '@/hooks/useVenues'
import { BookingStatusBadge } from './booking-status-badge'
import { BookingActions } from './booking-actions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faCalendarDays, faClock, faDollarSign, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface BookingDetailsProps {
  bookingId: string
  isRenter: boolean
  isVenueOwner: boolean
  isAdmin: boolean
  onActionComplete?: () => void
  className?: string
}

export function BookingDetails({
  bookingId,
  isRenter,
  isVenueOwner,
  isAdmin,
  onActionComplete,
  className,
}: BookingDetailsProps) {
  const { data: booking, loading, error } = useBooking(bookingId)
  const { data: venue } = useVenue(booking?.venue_id || null)

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" size="2x" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/10 p-4', className)}>
        <p className="text-destructive">{error || 'Booking not found'}</p>
      </div>
    )
  }

  const bookingDate = new Date(booking.date)
  const startTime = booking.start_time.slice(0, 5)
  const endTime = booking.end_time.slice(0, 5)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary-800">Booking Details</h2>
          <p className="text-sm text-primary-600 mt-1">ID: {booking.id}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Booking Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <FontAwesomeIcon icon={faCalendarDays} />
            <span className="text-sm font-medium">Date</span>
          </div>
          <p className="text-lg font-semibold text-primary-800">
            {format(bookingDate, 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <FontAwesomeIcon icon={faClock} />
            <span className="text-sm font-medium">Time</span>
          </div>
          <p className="text-lg font-semibold text-primary-800">
            {startTime} - {endTime}
          </p>
        </div>

        {venue && (
          <div className="rounded-lg border border-border bg-white p-4">
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

        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <FontAwesomeIcon icon={faDollarSign} />
            <span className="text-sm font-medium">Total Amount</span>
          </div>
          <p className="text-lg font-semibold text-primary-800">${booking.total_amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Additional Info */}
      {booking.notes && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h3 className="text-sm font-medium text-primary-600 mb-2">Notes</h3>
          <p className="text-primary-800">{booking.notes}</p>
        </div>
      )}

      {booking.recurring_type !== 'none' && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h3 className="text-sm font-medium text-primary-600 mb-2">Recurring Booking</h3>
          <p className="text-primary-800">
            {booking.recurring_type === 'weekly' ? 'Weekly' : 'Monthly'} recurring booking
            {booking.recurring_end_date && (
              <> until {format(new Date(booking.recurring_end_date), 'MMMM d, yyyy')}</>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t">
        <BookingActions
          booking={booking}
          isRenter={isRenter}
          isVenueOwner={isVenueOwner}
          isAdmin={isAdmin}
          onActionComplete={onActionComplete}
        />
      </div>
    </div>
  )
}


