import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'
import { JsonLd } from '@/components/seo/json-ld'
import { getDateStringInTimeZone, addDaysToDateString } from '@/utils/dateHelpers'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { logPerformance, measureDurationMs, startMeasurement } from '@/lib/performance'
import { findVenueBySlug, findVenueMetadataBySlug } from '@/lib/venuePage'
import {
  buildVenueCanonicalPath,
  buildVenueSeoDescription,
  buildVenueSeoTitle,
  buildVenueSportsActivityJsonLd,
  venueToSeoMetadata,
} from '@/lib/venueSeo'
import { AvailabilityService, type UnifiedAvailableSlot } from '@/services/availabilityService'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Venue } from '@/types'

export const revalidate = 300

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const INITIAL_AVAILABILITY_DAYS = 7

type PageProps = { params: Promise<{ name: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const metadataStartTime = startMeasurement()
  const { name: slug } = await params
  const supabase = createPublicServerClient()
  const venue = await findVenueMetadataBySlug(supabase, slug)

  logPerformance('venue-page-metadata', {
    slug,
    found: Boolean(venue),
    totalMs: measureDurationMs(metadataStartTime),
  })

  if (!venue) {
    return {
      title: 'Venue Not Found',
      description: 'Book venues on PlayBookings',
    }
  }

  const title = buildVenueSeoTitle(venue)
  const description = buildVenueSeoDescription(venue)
  const canonical = buildVenueCanonicalPath(slug)
  const ogImage = venue.primary_photo_url

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: venue.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function VenuePage({ params }: PageProps) {
  const pageStartTime = startMeasurement()
  const { name: slug } = await params
  const supabase = createPublicServerClient()

  const venueLookupStartTime = startMeasurement()
  const venue = await findVenueBySlug(supabase, slug)
  const venueLookupMs = measureDurationMs(venueLookupStartTime)

  if (!venue) {
    logPerformance('venue-page-load', {
      slug,
      found: false,
      venueLookupMs,
      totalMs: measureDurationMs(pageStartTime),
    })
    notFound()
  }

  const todayStr = getDateStringInTimeZone(new Date(), LOS_ANGELES_TIME_ZONE)
  const dateFrom = todayStr
  const dateTo = addDaysToDateString(todayStr, INITIAL_AVAILABILITY_DAYS - 1)

  const availabilityService = new AvailabilityService({
    getClient: async () => createPublicServerClient(),
    onTiming: (timing) => {
      logPerformance('venue-page-initial-availability', timing)
    },
  })

  const availabilityStartTime = startMeasurement()
  let initialAvailability: UnifiedAvailableSlot[] = []
  let initialAvailabilityFallback = false

  try {
    initialAvailability = await availabilityService.getAvailableSlots(venue.id, dateFrom, dateTo)
  } catch (error) {
    initialAvailabilityFallback = true
    console.error('Failed to load initial venue availability during SSR:', {
      slug,
      venueId: venue.id,
      dateFrom,
      dateTo,
      error,
    })
  }

  const availabilityMs = measureDurationMs(availabilityStartTime)

  logPerformance('venue-page-load', {
    slug,
    found: true,
    venueId: venue.id,
    venueLookupMs,
    initialAvailabilityMs: availabilityMs,
    initialAvailabilityCount: initialAvailability.length,
    initialAvailabilityFallback,
    totalMs: measureDurationMs(pageStartTime),
  })

  const jsonLd = buildVenueSportsActivityJsonLd(venueToSeoMetadata(venue as Venue), slug)

  return (
    <>
      <JsonLd id="venue-jsonld" data={jsonLd} />
      <VenueDesignEditorial
        venue={venue as Venue}
        initialAvailability={initialAvailability}
        faqStyle="accordion"
        bottomGallery="strip"
      />
    </>
  )
}
