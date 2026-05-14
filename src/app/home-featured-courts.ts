import { slugify } from '@/lib/utils'
import type { MapVenue } from '@/hooks/useVenuesWithNextAvailable'
import type { Venue } from '@/types'
import { deriveVenuePhotos } from '@/lib/venueMedia'
import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'

export interface FeaturedCourt {
  id: string
  name: string
  type: string
  hourlyRate: number
  nextAvailable: string
  image: string | null
  href: string
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getSortTimestamp(dateStr: string, timeStr: string): number {
  const slotDate = parseLocalDate(dateStr)
  const [hours, minutes] = timeStr.split(':').map(Number)
  slotDate.setHours(hours, minutes, 0, 0)
  return slotDate.getTime()
}

export function buildFeaturedCourts(
  venues: Venue[],
  availabilityVenues: MapVenue[],
  limit: number
): FeaturedCourt[] {
  const nextByVenue = new Map<string, { date: string; startTime: string }>()

  for (const venue of availabilityVenues) {
    if (!venue.nextAvailable) {
      continue
    }
    nextByVenue.set(venue.id, {
      date: venue.nextAvailable.date,
      startTime: venue.nextAvailable.startTime,
    })
  }

  return venues
    .filter((venue) => nextByVenue.has(venue.id))
    .map((venue) => {
      const nextSlot = nextByVenue.get(venue.id)
      if (!nextSlot) {
        return null
      }

      return {
        id: venue.id,
        name: venue.name,
        type: venue.venue_type || 'Sports Facility',
        hourlyRate: venue.hourly_rate,
        nextAvailable: formatCompactNextAvailable(nextSlot.date, nextSlot.startTime),
        image: deriveVenuePhotos(venue)[0] || null,
        href: `/venue/${slugify(venue.name)}`,
        sortTime: getSortTimestamp(nextSlot.date, nextSlot.startTime),
      }
    })
    .filter((court): court is FeaturedCourt & { sortTime: number } => court !== null)
    .sort((a, b) => a.sortTime - b.sortTime)
    .slice(0, limit)
    .map((court) => ({
      id: court.id,
      name: court.name,
      type: court.type,
      hourlyRate: court.hourlyRate,
      nextAvailable: court.nextAvailable,
      image: court.image,
      href: court.href,
    }))
}
