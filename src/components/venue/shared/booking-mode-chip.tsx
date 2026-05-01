'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { cn } from '@/lib/utils'
import { getBookingModeDisplay } from '@/lib/booking-mode'

interface BookingModeChipProps {
  instantBooking: boolean
  className?: string
}

export function BookingModeChip({
  instantBooking,
  className,
}: BookingModeChipProps) {
  const bookingMode = getBookingModeDisplay(instantBooking, 'compact')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-full border px-s py-xs text-xs font-medium',
        instantBooking
          ? 'border-accent-400/30 bg-accent-400/15 text-accent-400'
          : 'border-secondary-50/15 bg-secondary-50/10 text-secondary-50/80',
        className
      )}
    >
      <FontAwesomeIcon icon={bookingMode.icon} className="text-[0.75em]" />
      <span>{bookingMode.label}</span>
    </span>
  )
}
