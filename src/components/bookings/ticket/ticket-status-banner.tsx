'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faCircleCheck, faCircleXmark, faFlagCheckered, faShield } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'
import type { TicketState } from './ticket-utils'

interface TicketStatusBannerProps {
  statusVariant: TicketState['statusVariant']
  statusLabel: string
  statusDescription: string
}

const variantConfig = {
  pending: {
    borderColor: 'border-l-yellow-400',
    bgColor: 'bg-yellow-400/5',
    textColor: 'text-yellow-400',
    icon: faClock,
  },
  'pending-insurance': {
    borderColor: 'border-l-accent-400',
    bgColor: 'bg-accent-400/5',
    textColor: 'text-accent-400',
    icon: faShield,
  },
  confirmed: {
    borderColor: 'border-l-primary-400',
    bgColor: 'bg-primary-400/5',
    textColor: 'text-primary-400',
    icon: faCircleCheck,
  },
  cancelled: {
    borderColor: 'border-l-destructive',
    bgColor: 'bg-destructive/5',
    textColor: 'text-destructive',
    icon: faCircleXmark,
  },
  completed: {
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-400/5',
    textColor: 'text-blue-400',
    icon: faFlagCheckered,
  },
}

export function TicketStatusBanner({ statusVariant, statusLabel, statusDescription }: TicketStatusBannerProps) {
  const config = variantConfig[statusVariant]

  return (
    <div className={cn('border-l-4 rounded-lg p-4 flex items-center gap-3', config.borderColor, config.bgColor)}>
      <FontAwesomeIcon icon={config.icon} className={cn('text-lg', config.textColor)} />
      <div>
        <p className={cn('font-semibold text-sm', config.textColor)}>{statusLabel}</p>
        <p className="text-secondary-50/50 text-xs mt-0.5">{statusDescription}</p>
      </div>
    </div>
  )
}
