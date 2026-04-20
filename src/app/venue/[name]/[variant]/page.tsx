import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'
import { getDateStringInTimeZone, addDaysToDateString } from '@/utils/dateHelpers'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { logPerformance, measureDurationMs, startMeasurement } from '@/lib/performance'
import { findVenueBySlug, findVenueMetadataBySlug } from '@/lib/venuePage'
import { AvailabilityService, type UnifiedAvailableSlot } from '@/services/availabilityService'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Venue } from '@/types'

export const revalidate = 300

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const INITIAL_AVAILABILITY_DAYS = 7

const VALID_VARIANTS = ['1', '2', '3'] as const
type VariantId = (typeof VALID_VARIANTS)[number]

const VARIANT_CONFIG: Record<VariantId, {
  photoAffordance: 'pill' | 'cta' | 'expand'
  faqStyle: 'accordion' | 'tabs' | 'list'
  bottomGallery: 'strip' | 'mosaic' | 'tour'
}> = {
  '1': { photoAffordance: 'pill', faqStyle: 'accordion', bottomGallery: 'strip' },
  '2': { photoAffordance: 'cta', faqStyle: 'tabs', bottomGallery: 'mosaic' },
  '3': { photoAffordance: 'expand', faqStyle: 'list', bottomGallery: 'tour' },
}

type PageProps = { params: Promise<{ name: string; variant: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name: slug, variant } = await params

  if (!VALID_VARIANTS.includes(variant as VariantId)) {
    return { title: 'Venue Not Found' }
  }

  const supabase = createPublicServerClient()
  const venue = await findVenueMetadataBySlug(supabase, slug)

  return {
    title: venue ? `${venue.name} — v${variant} | PlayBookings` : 'Venue Not Found',
    description: venue?.description || 'Book venues on PlayBookings',
    robots: { index: false },
  }
}

export default async function VenueVariantPage({ params }: PageProps) {
  const pageStartTime = startMeasurement()
  const { name: slug, variant } = await params

  if (!VALID_VARIANTS.includes(variant as VariantId)) {
    notFound()
  }

  const config = VARIANT_CONFIG[variant as VariantId]
  const supabase = createPublicServerClient()

  const venueLookupStartTime = startMeasurement()
  const venue = await findVenueBySlug(supabase, slug)
  const venueLookupMs = measureDurationMs(venueLookupStartTime)

  if (!venue) {
    logPerformance('venue-variant-page-load', {
      slug,
      variant,
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
      logPerformance('venue-variant-page-initial-availability', timing)
    },
  })

  const availabilityStartTime = startMeasurement()
  let initialAvailability: UnifiedAvailableSlot[] = []

  try {
    initialAvailability = await availabilityService.getAvailableSlots(venue.id, dateFrom, dateTo)
  } catch (error) {
    console.error('Failed to load initial venue availability during SSR:', {
      slug,
      variant,
      venueId: venue.id,
      dateFrom,
      dateTo,
      error,
    })
  }

  const availabilityMs = measureDurationMs(availabilityStartTime)

  logPerformance('venue-variant-page-load', {
    slug,
    variant,
    found: true,
    venueId: venue.id,
    venueLookupMs,
    initialAvailabilityMs: availabilityMs,
    initialAvailabilityCount: initialAvailability.length,
    totalMs: measureDurationMs(pageStartTime),
  })

  return (
    <VenueDesignEditorial
      venue={venue as Venue}
      initialAvailability={initialAvailability}
      photoAffordance={config.photoAffordance}
      faqStyle={config.faqStyle}
      bottomGallery={config.bottomGallery}
    />
  )
}
