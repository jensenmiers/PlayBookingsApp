'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import { getBookingModeDisplay } from '@/lib/booking-mode'

interface BookingTypeBadgeProps {
  instantBooking: boolean
  insuranceRequired?: boolean
  variant?: 'default' | 'compact' | 'pill' | 'glow' | 'minimal'
  showInsurance?: boolean
  className?: string
}

export function BookingTypeBadge({
  instantBooking,
  insuranceRequired = false,
  variant = 'default',
  showInsurance = true,
  className,
}: BookingTypeBadgeProps) {
  const bookingMode = getBookingModeDisplay(
    instantBooking,
    variant === 'default' ? 'full' : 'compact'
  )

  const baseStyles = {
    default: 'flex items-center gap-s text-sm',
    compact: 'flex items-center gap-s text-xs',
    pill: 'inline-flex items-center gap-s px-m py-xs rounded-full text-xs font-medium',
    glow: 'inline-flex items-center gap-s px-m py-s rounded-lg text-sm font-medium',
    minimal: 'inline-flex items-center gap-xs text-xs',
  }

  const instantStyles = {
    default: 'text-primary-400',
    compact: 'text-primary-400',
    pill: 'bg-primary-400/15 text-primary-400 border border-primary-400/30',
    glow: 'bg-primary-400/10 text-primary-400 shadow-lg shadow-primary-400/20 border border-primary-400/20',
    minimal: 'text-primary-400',
  }

  const approvalStyles = {
    default: 'text-accent-400',
    compact: 'text-accent-400',
    pill: 'bg-accent-400/15 text-accent-400 border border-accent-400/30',
    glow: 'bg-accent-400/10 text-accent-400 shadow-lg shadow-accent-400/20 border border-accent-400/20',
    minimal: 'text-accent-400',
  }

  const insuranceStyles = {
    default: 'text-secondary-50/60',
    compact: 'text-secondary-50/50',
    pill: 'bg-secondary-50/5 text-secondary-50/70 border border-secondary-50/10',
    glow: 'bg-secondary-50/5 text-secondary-50/70 border border-secondary-50/10',
    minimal: 'text-secondary-50/50',
  }

  return (
    <div className={cn('flex flex-wrap gap-s', className)}>
      <span
        className={cn(
          baseStyles[variant],
          instantBooking ? instantStyles[variant] : approvalStyles[variant]
        )}
      >
        <FontAwesomeIcon
          icon={bookingMode.icon}
          className={variant === 'glow' ? 'animate-pulse' : ''}
        />
        <span>{bookingMode.label}</span>
      </span>

      {showInsurance && insuranceRequired && (
        <span className={cn(baseStyles[variant], insuranceStyles[variant])}>
          <FontAwesomeIcon icon={faShield} />
          <span>Insurance Required</span>
        </span>
      )}
    </div>
  )
}

interface BookingTypeBadgeInlineProps {
  instantBooking: boolean
  className?: string
}

export function BookingTypeBadgeInline({
  instantBooking,
  className,
}: BookingTypeBadgeInlineProps) {
  const bookingMode = getBookingModeDisplay(instantBooking, 'compact')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs',
        instantBooking ? 'text-primary-400' : 'text-accent-400',
        className
      )}
    >
      <FontAwesomeIcon
        icon={bookingMode.icon}
        className="text-[0.75em]"
      />
    </span>
  )
}
