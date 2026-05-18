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

interface BuildFeaturedCourtsOptions {
  preferredVenueNames?: string[]
  fallbackAvailabilityLabel?: string
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

function normalizeVenueName(name: string): string {
  return name.trim().toLowerCase()
}

function mapVenueToFeaturedCourt(
  venue: Venue,
  nextSlot: { date: string; startTime: string } | undefined,
  fallbackAvailabilityLabel: string
): FeaturedCourt & { sortTime: number } {
  return {
    id: venue.id,
    name: venue.name,
    type: venue.venue_type || 'Sports Facility',
    hourlyRate: venue.hourly_rate,
    nextAvailable: nextSlot
      ? formatCompactNextAvailable(nextSlot.date, nextSlot.startTime)
      : fallbackAvailabilityLabel,
    image: deriveVenuePhotos(venue)[0] || null,
    href: `/venue/${slugify(venue.name)}`,
    sortTime: nextSlot ? getSortTimestamp(nextSlot.date, nextSlot.startTime) : Number.MAX_SAFE_INTEGER,
  }
}

function stripSortTime(court: FeaturedCourt & { sortTime: number }): FeaturedCourt {
  return {
    id: court.id,
    name: court.name,
    type: court.type,
    hourlyRate: court.hourlyRate,
    nextAvailable: court.nextAvailable,
    image: court.image,
    href: court.href,
  }
}

export function buildFeaturedCourts(
  venues: Venue[],
  availabilityVenues: MapVenue[],
  limit: number,
  options: BuildFeaturedCourtsOptions = {}
): FeaturedCourt[] {
  const nextByVenue = new Map<string, { date: string; startTime: string }>()
  const fallbackAvailabilityLabel = options.fallbackAvailabilityLabel || 'by request'

  for (const venue of availabilityVenues) {
    if (!venue.nextAvailable) {
      continue
    }
    nextByVenue.set(venue.id, {
      date: venue.nextAvailable.date,
      startTime: venue.nextAvailable.startTime,
    })
  }

  const dynamicCourts = venues
    .filter((venue) => nextByVenue.has(venue.id))
    .map((venue) => mapVenueToFeaturedCourt(venue, nextByVenue.get(venue.id), fallbackAvailabilityLabel))
    .sort((a, b) => a.sortTime - b.sortTime)

  if (!options.preferredVenueNames?.length) {
    return dynamicCourts.slice(0, limit).map(stripSortTime)
  }

  const venuesByName = new Map(venues.map((venue) => [normalizeVenueName(venue.name), venue]))
  const preferredCourts = options.preferredVenueNames
    .map((venueName) => venuesByName.get(normalizeVenueName(venueName)))
    .filter((venue): venue is Venue => Boolean(venue))
    .map((venue) => mapVenueToFeaturedCourt(venue, nextByVenue.get(venue.id), fallbackAvailabilityLabel))

  const preferredIds = new Set(preferredCourts.map((court) => court.id))
  const remainingCourts = dynamicCourts.filter((court) => !preferredIds.has(court.id))

  return [...preferredCourts, ...remainingCourts].slice(0, limit).map(stripSortTime)
}
