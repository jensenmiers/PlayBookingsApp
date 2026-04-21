import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { findNeighborhoodBySlug } from '@/lib/laNeighborhoods'
import { loadVenuesForNeighborhood } from '@/lib/landingVenues'
import { LandingPageShell } from '@/components/seo/landing-page-shell'
import { LandingVenueGrid } from '@/components/seo/landing-venue-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { SITE_ORIGIN } from '@/lib/venueSeo'
import { slugifyVenueName } from '@/lib/venuePage'

export const revalidate = 600

type PageProps = { params: Promise<{ neighborhood: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { neighborhood: slug } = await params
  const hood = findNeighborhoodBySlug(slug)
  if (!hood) {
    return { title: 'Neighborhood Not Found', robots: { index: false } }
  }
  const title = `Rent a Gym in ${hood.name}, LA — Hourly Private Gym Rentals`
  const description = `Private gym rentals in ${hood.name}, Los Angeles. Book hourly for team practices, private training, camps, birthdays, and events.`
  const canonical = `/los-angeles/gym-rentals/${hood.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function NeighborhoodGymPage({ params }: PageProps) {
  const { neighborhood: slug } = await params
  const hood = findNeighborhoodBySlug(slug)
  if (!hood) notFound()

  const supabase = createPublicServerClient()
  const venues = await loadVenuesForNeighborhood(supabase, hood.slug, 'gym-rentals')

  if (venues.length === 0) {
    notFound()
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Gyms in ${hood.name}, LA`,
    itemListElement: venues.map((venue, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: venue.name,
      url: `${SITE_ORIGIN}/venue/${slugifyVenueName(venue.name)}`,
    })),
  }

  return (
    <LandingPageShell
      h1={`Private Gym Rental in ${hood.name}, LA`}
      intro={`Gyms in ${hood.name} available to rent by the hour — for team practices, private training, birthdays, camps, and events. Real-time availability, instant booking.`}
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { label: 'Los Angeles' },
        { href: '/los-angeles/gym-rentals', label: 'Gym Rentals' },
        { label: hood.name },
      ]}
    >
      <JsonLd id={`la-gym-${hood.slug}-jsonld`} data={itemListJsonLd} />
      <LandingVenueGrid venues={venues} />
    </LandingPageShell>
  )
}
