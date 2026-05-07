'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '@/lib/utils'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import type { BookingMode } from '@/types'

interface BookingModeChipProps {
  instantBooking?: boolean
  bookingMode?: BookingMode | null
  className?: string
}

export function BookingModeChip({
  instantBooking,
  bookingMode,
  className,
}: BookingModeChipProps) {
  const display = getBookingModeDisplay(bookingMode ?? Boolean(instantBooking), 'compact')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-full border px-s py-xs text-xs font-medium',
        display.mode === 'instant'
          ? 'border-accent-400/30 bg-accent-400/15 text-accent-400'
          : display.mode === 'request'
          ? 'border-primary-400/30 bg-primary-400/10 text-primary-400'
          : 'border-secondary-50/15 bg-secondary-50/10 text-secondary-50/80',
        className
      )}
    >
      <FontAwesomeIcon icon={display.icon} className="text-[0.75em]" />
      <span>{display.label}</span>
    </span>
  )
}
