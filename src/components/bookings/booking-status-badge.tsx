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
    className: 'bg-accent-100 text-accent-800 border-accent-200',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-primary-100 text-primary-800 border-primary-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/15 text-destructive border-destructive/40',
  },
  completed: {
    label: 'Completed',
    className: 'bg-primary-100 text-primary-800 border-primary-200',
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
        'inline-flex items-center rounded-full border px-m py-xxs text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

