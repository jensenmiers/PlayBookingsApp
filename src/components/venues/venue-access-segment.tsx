'use client'

import { cn } from '@/lib/utils'
import type { VenueAccessFilter } from '@/lib/venueAccess'

const OPTIONS: Array<{ value: VenueAccessFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open_gym', label: 'Open Gym' },
  { value: 'private_rental', label: 'Private Rentals' },
]

interface VenueAccessSegmentProps {
  value: VenueAccessFilter
  onChange: (value: VenueAccessFilter) => void
  className?: string
}

export function VenueAccessSegment({ value, onChange, className }: VenueAccessSegmentProps) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full flex-wrap rounded-full border border-secondary-50/15 bg-secondary-800 p-xs',
        className
      )}
      role="group"
      aria-label="Venue access type"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            className={cn(
              'rounded-full px-m py-xs text-xs font-medium transition-colors min-h-11',
              selected
                ? 'bg-primary-400 text-secondary-900'
                : 'text-secondary-50/70 hover:text-secondary-50'
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
