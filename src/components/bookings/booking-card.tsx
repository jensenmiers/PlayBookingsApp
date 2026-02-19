'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCreditCard } from '@fortawesome/free-solid-svg-icons'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/utils/dateHelpers'
import { getTicketState } from './ticket/ticket-utils'
import { cn } from '@/lib/utils'
import type { BookingWithVenue } from '@/types'

interface BookingCardProps {
  booking: BookingWithVenue
  onPayClick: (booking: BookingWithVenue) => void
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getRelativeDate(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'MMM d')
}

const statusBorderColor: Record<string, string> = {
  pending: 'border-l-yellow-400',
  'pending-insurance': 'border-l-accent-400',
  confirmed: 'border-l-primary-400',
  cancelled: 'border-l-destructive',
  completed: 'border-l-blue-400',
}

const statusDotColor: Record<string, string> = {
  pending: 'bg-yellow-400',
  'pending-insurance': 'bg-accent-400',
  confirmed: 'bg-primary-400',
  cancelled: 'bg-destructive',
  completed: 'bg-blue-400',
}

export function BookingCard({ booking, onPayClick }: BookingCardProps) {
  const ticketState = getTicketState(booking, null)
  const venueName = booking.venue?.name || 'Unknown Venue'
  const primaryPhoto = booking.venue?.photos?.[0]
  const relativeDate = getRelativeDate(booking.date)
  const startTime = formatTime(booking.start_time)
  const endTime = formatTime(booking.end_time)

  const handlePayClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onPayClick(booking)
  }

  return (
    <Link
      href={`/my-bookings/${booking.id}`}
      className={cn(
        'block rounded-2xl border-l-4 border border-secondary-50/10 bg-secondary-800 shadow-soft hover:shadow-glass transition-all overflow-hidden',
        statusBorderColor[ticketState.statusVariant]
      )}
    >
      {/* Card body */}
      <div className="p-4">
        <div className="flex gap-3.5">
          {/* Venue photo thumbnail */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={venueName}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary-700 to-secondary-800" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-secondary-50 truncate">
                {venueName}
              </h3>
              {/* Status dot */}
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5',
                  statusDotColor[ticketState.statusVariant]
                )}
              />
            </div>
            <p className="text-sm text-secondary-50/50 mt-0.5">
              {relativeDate} · {startTime} – {endTime}
            </p>
            <p
              className={cn(
                'font-mono text-sm mt-1',
                ticketState.showAmount === 'prominent'
                  ? 'text-primary-400 font-semibold'
                  : 'text-secondary-50/40'
              )}
            >
              ${booking.total_amount.toFixed(2)}
              {ticketState.showAmount === 'subdued' && (
                <span className="font-sans ml-1">paid</span>
              )}
            </p>
          </div>
        </div>

        {/* Primary CTA — only Pay button on cards */}
        {ticketState.primaryAction === 'pay' && (
          <div className="mt-3">
            <Button onClick={handlePayClick} size="sm" className="w-full">
              <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
              Pay ${booking.total_amount.toFixed(2)}
            </Button>
          </div>
        )}
      </div>
    </Link>
  )
}
