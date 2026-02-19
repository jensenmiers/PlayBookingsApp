/**
 * Booking List Component
 * Mini-ticket card list with segmented filters and contextual actions
 */

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useBookings } from '@/hooks/useBookings'
import { BookingCard } from './booking-card'
import { BookingListSkeleton } from './booking-list-skeleton'
import { PaymentModal } from '@/components/payments/payment-modal'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBasketball } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import type { BookingWithVenue, BookingStatus } from '@/types'
import type { ListBookingsQueryParams } from '@/types/api'

interface BookingListProps {
  initialFilters?: ListBookingsQueryParams
  className?: string
}

type TimeView = NonNullable<ListBookingsQueryParams['time_view']>

const DEFAULT_TIME_VIEW: TimeView = 'upcoming'

const STATUS_CHIPS_BY_TIME_VIEW: Record<TimeView, { label: string; value: BookingStatus | undefined }[]> = {
  upcoming: [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Cancelled', value: 'cancelled' },
  ],
  past: [
    { label: 'All', value: undefined },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ],
}

function normalizeStatusForTimeView(
  status: BookingStatus | undefined,
  timeView: TimeView
): BookingStatus | undefined {
  const allowedStatuses = STATUS_CHIPS_BY_TIME_VIEW[timeView].map((chip) => chip.value)
  return allowedStatuses.includes(status) ? status : undefined
}

export function BookingList({ initialFilters, className }: BookingListProps) {
  const [filters, setFilters] = useState<ListBookingsQueryParams>(() => {
    const initialTimeView = initialFilters?.time_view || DEFAULT_TIME_VIEW

    return {
      status: normalizeStatusForTimeView(initialFilters?.status, initialTimeView),
      venue_id: initialFilters?.venue_id,
      time_view: initialTimeView,
      page: initialFilters?.page || '1',
      limit: initialFilters?.limit || '20',
      role_view: initialFilters?.role_view,
    }
  })
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithVenue | null>(null)

  const { data: bookings, loading, error, refetch } = useBookings(filters)

  const handlePayNow = useCallback((booking: BookingWithVenue) => {
    setSelectedBooking(booking)
    setPaymentModalOpen(true)
  }, [])

  const handlePaymentSuccess = useCallback(() => {
    setPaymentModalOpen(false)
    setSelectedBooking(null)
    refetch()
  }, [refetch])

  const handleFilterChange = (key: keyof ListBookingsQueryParams, value: string | undefined) => {
    setFilters((prev) => {
      const nextFilters: ListBookingsQueryParams = {
        ...prev,
        [key]: value || undefined,
        page: key === 'page' ? (value || '1') : '1',
      }

      if (key === 'time_view') {
        const nextTimeView = (value as TimeView | undefined) || DEFAULT_TIME_VIEW
        nextFilters.time_view = nextTimeView
        nextFilters.status = normalizeStatusForTimeView(prev.status, nextTimeView)
      }

      return nextFilters
    })
  }

  const statusChips = STATUS_CHIPS_BY_TIME_VIEW[filters.time_view || DEFAULT_TIME_VIEW]

  if (loading && !bookings) {
    return <BookingListSkeleton />
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/10 p-4', className)}>
        <p className="text-destructive">{error}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Segmented time toggle */}
      <div className="inline-flex h-11 items-center rounded-xl bg-secondary-800 p-1">
        <button
          onClick={() => handleFilterChange('time_view', 'upcoming')}
          className={cn(
            'inline-flex h-9 items-center justify-center rounded-lg px-5 text-sm font-medium transition-all',
            filters.time_view === 'upcoming'
              ? 'bg-secondary-700 text-secondary-50 shadow-soft'
              : 'text-secondary-50/50 hover:text-secondary-50'
          )}
        >
          Upcoming
        </button>
        <button
          onClick={() => handleFilterChange('time_view', 'past')}
          className={cn(
            'inline-flex h-9 items-center justify-center rounded-lg px-5 text-sm font-medium transition-all',
            filters.time_view === 'past'
              ? 'bg-secondary-700 text-secondary-50 shadow-soft'
              : 'text-secondary-50/50 hover:text-secondary-50'
          )}
        >
          Past
        </button>
      </div>

      {/* Status chip bar */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mt-2">
        {statusChips.map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleFilterChange('status', chip.value)}
            className={cn(
              'flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all border',
              filters.status === chip.value
                ? 'bg-secondary-50/10 text-secondary-50 border-secondary-50/20'
                : 'text-secondary-50/40 border-transparent hover:text-secondary-50/60 hover:bg-secondary-50/5'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      {!bookings || bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary-50/5 flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faBasketball} className="text-secondary-50/20 text-xl" />
          </div>
          <p className="text-secondary-50/60 font-medium">
            {filters.time_view === 'past' ? 'No past bookings' : 'No upcoming bookings'}
          </p>
          <p className="text-secondary-50/30 text-sm mt-1 max-w-[240px]">
            {filters.time_view === 'past'
              ? 'Your completed and cancelled bookings will appear here'
              : 'Find a court and book your next game'}
          </p>
          {filters.time_view === 'upcoming' && (
            <Link href="/search">
              <Button variant="outline" size="sm" className="mt-4">
                Browse Courts
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking as BookingWithVenue}
              onPayClick={handlePayNow}
            />
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedBooking && (
        <PaymentModal
          bookingId={selectedBooking.id}
          amount={selectedBooking.total_amount}
          venueName={selectedBooking.venue?.name || 'Venue'}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Pagination */}
      {bookings && bookings.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-secondary-50/30">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const page = parseInt(filters.page || '1')
                if (page > 1) {
                  handleFilterChange('page', String(page - 1))
                }
              }}
              disabled={filters.page === '1'}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const page = parseInt(filters.page || '1')
                handleFilterChange('page', String(page + 1))
              }}
              disabled={bookings.length < parseInt(filters.limit || '20')}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
