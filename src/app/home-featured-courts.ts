import { slugify } from '@/lib/utils'
import type { MapVenue } from '@/lib/venueDiscovery'
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
  venue: MapVenue,
  fallbackAvailabilityLabel: string
): FeaturedCourt & { sortTime: number } {
  const nextSlot = venue.nextAvailable
  return {
    id: venue.id,
    name: venue.name,
    type: venue.venueType || 'Sports Facility',
    hourlyRate: venue.hourlyRate,
    nextAvailable: nextSlot
      ? formatCompactNextAvailable(nextSlot.date, nextSlot.startTime)
      : fallbackAvailabilityLabel,
    image: venue.photo,
    href: `/venue/${slugify(venue.name)}`,
    sortTime: nextSlot
      ? getSortTimestamp(nextSlot.date, nextSlot.startTime)
      : Number.MAX_SAFE_INTEGER,
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
  venues: MapVenue[],
  limit: number,
  options: BuildFeaturedCourtsOptions = {}
): FeaturedCourt[] {
  const fallbackAvailabilityLabel = options.fallbackAvailabilityLabel || 'by request'

  const dynamicCourts = venues
    .filter((venue) => venue.nextAvailable !== null)
    .map((venue) => mapVenueToFeaturedCourt(venue, fallbackAvailabilityLabel))
    .sort((a, b) => a.sortTime - b.sortTime)

  if (!options.preferredVenueNames?.length) {
    return dynamicCourts.slice(0, limit).map(stripSortTime)
  }

  const venuesByName = new Map(
    venues.map((venue) => [normalizeVenueName(venue.name), venue])
  )
  const preferredCourts = options.preferredVenueNames
    .map((venueName) => venuesByName.get(normalizeVenueName(venueName)))
    .filter((venue): venue is MapVenue => Boolean(venue))
    .map((venue) => mapVenueToFeaturedCourt(venue, fallbackAvailabilityLabel))

  const preferredIds = new Set(preferredCourts.map((court) => court.id))
  const remainingCourts = dynamicCourts.filter((court) => !preferredIds.has(court.id))

  return [...preferredCourts, ...remainingCourts].slice(0, limit).map(stripSortTime)
}
