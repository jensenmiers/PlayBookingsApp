/**
 * Booking Status Badge Component
 * Visual status indicator for bookings
 */

'use client'

import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/types'

interface BookingStatusBadgeProps {
  status: BookingStatus
  expired?: boolean
  className?: string
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

const expiredConfig = {
  label: 'Expired',
  className: 'bg-secondary-50/10 text-secondary-50/80 border-secondary-50/20',
}

export function BookingStatusBadge({ status, expired = false, className }: BookingStatusBadgeProps) {
  const config = expired && status === 'pending' ? expiredConfig : statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

