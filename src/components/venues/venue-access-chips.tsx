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
    <div className={cn('flex flex-wrap gap-xs', className)}>
      {labels.map((label) => (
        <span
          key={label}
          className={cn(
            'inline-flex items-center rounded-full border px-s py-xs text-xs font-medium',
            label === 'Open Gym'
              ? 'border-accent-400/30 bg-accent-400/15 text-accent-400'
              : 'border-primary-400/30 bg-primary-400/10 text-primary-400'
          )}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
