/**
 * Booking List Component
 * List of bookings with filters and pagination
 */

'use client'

import { useState } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { BookingStatusBadge } from './booking-status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faFilter } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/types'
import type { ListBookingsQueryParams } from '@/types/api'
import { formatTime } from '@/utils/dateHelpers'
import Link from 'next/link'

interface BookingListProps {
  initialFilters?: ListBookingsQueryParams
  className?: string
}

export function BookingList({ initialFilters, className }: BookingListProps) {
  const [filters, setFilters] = useState<ListBookingsQueryParams>({
    status: initialFilters?.status,
    venue_id: initialFilters?.venue_id,
    date_from: initialFilters?.date_from,
    date_to: initialFilters?.date_to,
    page: initialFilters?.page || '1',
    limit: initialFilters?.limit || '20',
    role_view: initialFilters?.role_view,
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data: bookings, loading, error, refetch } = useBookings(filters)

  const handleFilterChange = (key: keyof ListBookingsQueryParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: '1', // Reset to first page on filter change
    }))
  }

  const clearFilters = () => {
    setFilters({
      page: '1',
      limit: '20',
      role_view: initialFilters?.role_view, // Preserve role_view when clearing
    })
  }

  if (loading && !bookings) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-600" size="2x" />
      </div>
    )
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
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FontAwesomeIcon icon={faFilter} className="mr-2" />
          Filters
        </Button>
        {(filters.status || filters.date_from || filters.date_to) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-lg border border-border bg-white p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  handleFilterChange('status', e.target.value || undefined)
                }
                className="flex h-11 w-full rounded-lg border border-input bg-white/80 px-4 py-2 text-sm shadow-xs"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Booking List */}
      {!bookings || bookings.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-secondary-600">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/my-bookings/${booking.id}`}
              className="block"
            >
              <div className="rounded-lg border border-border bg-white p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-secondary-800">
                      {booking.date} • {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </h3>
                    <p className="text-sm text-secondary-600 mt-1">Booking ID: {booking.id.slice(0, 8)}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-600">Total: ${booking.total_amount.toFixed(2)}</p>
                  {booking.notes && (
                    <p className="text-sm text-secondary-600 truncate max-w-xs">
                      {booking.notes}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {bookings && bookings.length > 0 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-secondary-600">
            Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
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
