import { VenueCard } from '@/components/venues/venue-card'
import type { Venue } from '@/types'

type LandingVenueGridProps = {
  venues: Venue[]
  emptyMessage?: string
}

export function LandingVenueGrid({ venues, emptyMessage }: LandingVenueGridProps) {
  if (venues.length === 0) {
    return (
      <p className="text-secondary-50/60 text-sm">
        {emptyMessage ?? 'No venues listed yet — check back soon.'}
      </p>
    )
  }

  return (
    <div className="grid gap-m sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  )
}
