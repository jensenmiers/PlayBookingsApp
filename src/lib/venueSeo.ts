import type { VenueSeoMetadata } from '@/lib/venuePage'
import type { Venue } from '@/types'

export const SITE_ORIGIN = 'https://www.playbookings.com'

export function venueToSeoMetadata(venue: Venue): VenueSeoMetadata {
  const primary = (venue.media ?? []).find((m) => m.is_primary) ?? venue.media?.[0]
  const primaryPhoto = primary?.public_url ?? venue.photos?.[0] ?? null
  return {
    id: venue.id,
    name: venue.name,
    description: venue.description ?? null,
    venue_type: venue.venue_type ?? null,
    address: venue.address ?? null,
    city: venue.city ?? null,
    state: venue.state ?? null,
    zip_code: venue.zip_code ?? null,
    neighborhood: venue.neighborhood ?? null,
    neighborhood_slug: venue.neighborhood_slug ?? null,
    latitude: typeof venue.latitude === 'number' ? venue.latitude : null,
    longitude: typeof venue.longitude === 'number' ? venue.longitude : null,
    hourly_rate: typeof venue.hourly_rate === 'number' ? venue.hourly_rate : null,
    weekend_rate: typeof venue.weekend_rate === 'number' ? venue.weekend_rate : null,
    primary_photo_url: primaryPhoto,
  }
}

export function isGymVenueType(venueType: string | null | undefined): boolean {
  if (!venueType) return false
  return /gym|gymnasium|fieldhouse|studio/i.test(venueType)
}

export function venueCategoryLabel(venue: Pick<VenueSeoMetadata, 'venue_type'>): string {
  return isGymVenueType(venue.venue_type) ? 'Gym' : 'Indoor Basketball Court'
}

export function venueLocationLabel(
  venue: Pick<VenueSeoMetadata, 'neighborhood' | 'city'>
): string {
  if (venue.neighborhood && venue.neighborhood.toLowerCase() !== 'los angeles') {
    return `${venue.neighborhood}, LA`
  }
  if (venue.city) return venue.city
  return 'Los Angeles'
}

export function buildVenueSeoTitle(venue: VenueSeoMetadata): string {
  const category = venueCategoryLabel(venue)
  const location = venueLocationLabel(venue)
  if (venue.hourly_rate) {
    return `Book ${venue.name} — ${category} in ${location} — $${venue.hourly_rate}/hr`
  }
  return `Book ${venue.name} — ${category} in ${location}`
}

export function buildVenueSeoDescription(venue: VenueSeoMetadata): string {
  const category = venueCategoryLabel(venue).toLowerCase()
  const location = venueLocationLabel(venue)
  const priceFragment = venue.hourly_rate
    ? ` Hourly rates from $${venue.hourly_rate}.`
    : ''
  const fallback = `Rent ${venue.name}, a private ${category} in ${location}. Perfect for pickup runs, team practices, birthday parties, and private events.${priceFragment} Book online in minutes.`
  if (venue.description && venue.description.length > 40) {
    const trimmed = venue.description.replace(/\s+/g, ' ').trim().slice(0, 140)
    return `${trimmed} — Book in ${location} on PlayBookings.${priceFragment}`
  }
  return fallback
}

export function buildVenueCanonicalPath(slug: string): string {
  return `/venue/${slug}`
}

export function buildVenueSportsActivityJsonLd(
  venue: VenueSeoMetadata,
  slug: string
): Record<string, unknown> {
  const category = venueCategoryLabel(venue)
  const url = `${SITE_ORIGIN}${buildVenueCanonicalPath(slug)}`

  const address: Record<string, string> = { '@type': 'PostalAddress' }
  if (venue.address) address.streetAddress = venue.address
  if (venue.city) address.addressLocality = venue.city
  if (venue.state) address.addressRegion = venue.state
  if (venue.zip_code) address.postalCode = venue.zip_code
  address.addressCountry = 'US'

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: venue.name,
    description: venue.description ?? buildVenueSeoDescription(venue),
    url,
    sport: 'Basketball',
    additionalType: category,
    address,
  }

  if (venue.latitude !== null && venue.longitude !== null) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: venue.latitude,
      longitude: venue.longitude,
    }
  }

  if (venue.primary_photo_url) {
    schema.image = venue.primary_photo_url
  }

  if (venue.hourly_rate) {
    schema.priceRange = `$${venue.hourly_rate}/hr`
    schema.makesOffer = {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: venue.hourly_rate,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: venue.hourly_rate,
        priceCurrency: 'USD',
        unitCode: 'HUR',
      },
      availability: 'https://schema.org/InStock',
      url,
    }
  }

  return schema
}
