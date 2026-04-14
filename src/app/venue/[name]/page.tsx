import { format } from 'date-fns'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { logPerformance, measureDurationMs, startMeasurement } from '@/lib/performance'
import { findVenueBySlug, findVenueMetadataBySlug } from '@/lib/venuePage'
import { AvailabilityService } from '@/services/availabilityService'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Venue } from '@/types'

export const revalidate = 300

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const INITIAL_AVAILABILITY_DAYS = 7

type PageProps = { params: Promise<{ name: string }> }

function getDateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')
  const year = get('year')
  const month = get('month')
  const day = get('day')

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}

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

  return {
    title: venue ? `${venue.name} | PlayBookings` : 'Venue Not Found',
    description: venue?.description || 'Book venues on PlayBookings',
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
  const initialAvailability = await availabilityService.getAvailableSlots(venue.id, dateFrom, dateTo)
  const availabilityMs = measureDurationMs(availabilityStartTime)

  logPerformance('venue-page-load', {
    slug,
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
    />
  )
}
