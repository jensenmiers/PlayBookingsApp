import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Navigation } from '@/components/layout/navigation'
import { RequestToBookPage } from '@/components/venue/request-to-book/request-to-book-page'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { findVenueAdminConfigByVenueId, findVenueBySlug } from '@/lib/venuePage'
import { resolveVenueBookingMode } from '@/lib/booking-mode'
import type { Venue } from '@/types'

type PageProps = {
  params: Promise<{ name: string }>
  searchParams: Promise<{ date?: string; start?: string; end?: string }>
}

export const metadata: Metadata = {
  title: 'Request to book',
  robots: { index: false },
}

export default async function VenueRequestPage({ params, searchParams }: PageProps) {
  const { name: slug } = await params
  const { date, start, end } = await searchParams
  const supabase = createPublicServerClient()

  const venue = await findVenueBySlug(supabase, slug)
  if (!venue) {
    notFound()
  }
  // Only request-to-book venues take requests; other venues book from their own page.
  if (resolveVenueBookingMode(venue as Venue) !== 'request_to_book') {
    redirect(`/venue/${slug}`)
  }

  const venueAdminConfig = await findVenueAdminConfigByVenueId(supabase, venue.id)

  return (
    <div className="min-h-screen bg-secondary-900">
      <Navigation />
      <RequestToBookPage
        venue={venue as Venue}
        venueSlug={slug}
        venueAdminConfig={venueAdminConfig}
        initial={{ date, startTime: start, endTime: end }}
      />
    </div>
  )
}
