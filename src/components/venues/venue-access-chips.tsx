'use client'

import { cn } from '@/lib/utils'
import { getVenueAccessLabels, type VenueAccessFields } from '@/lib/venueAccess'

interface VenueAccessChipsProps {
  venue: VenueAccessFields
  className?: string
}

export function VenueAccessChips({ venue, className }: VenueAccessChipsProps) {
  const labels = getVenueAccessLabels(venue)

  if (labels.length === 0) {
    return null
  }

  return (
    <div
      data-slot="venue-access-chips"
      className={cn('flex flex-wrap gap-xs', className)}
    >
      {labels.map((label) => (
        <span
          key={label}
          data-slot="venue-access-chip"
          className={cn(
            'inline-flex items-center rounded-full border px-m py-xs text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md',
            label === 'Open Gym'
              ? 'border-accent-400/50 bg-secondary-900/75 text-accent-300'
              : 'border-primary-400/50 bg-secondary-900/75 text-primary-300'
          )}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
