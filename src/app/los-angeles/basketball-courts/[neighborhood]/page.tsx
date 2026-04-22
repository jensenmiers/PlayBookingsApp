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
  const title = `Rent a Basketball Court in ${hood.name}, LA — Book by the Hour`
  const description = `Private indoor basketball courts in ${hood.name}, Los Angeles. Hourly rates, real-time availability, instant online booking for pickup runs, team practices, birthdays, and private events.`
  const canonical = `/los-angeles/basketball-courts/${hood.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function NeighborhoodBasketballPage({ params }: PageProps) {
  const { neighborhood: slug } = await params
  const hood = findNeighborhoodBySlug(slug)
  if (!hood) notFound()

  const supabase = createPublicServerClient()
  const venues = await loadVenuesForNeighborhood(supabase, hood.slug, 'basketball-courts')

  if (venues.length === 0) {
    notFound()
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Basketball courts in ${hood.name}, LA`,
    itemListElement: venues.map((venue, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: venue.name,
      url: `${SITE_ORIGIN}/venue/${slugifyVenueName(venue.name)}`,
    })),
  }

  return (
    <LandingPageShell
      h1={`Rent an Indoor Basketball Court in ${hood.name}, LA`}
      intro={`Private courts in ${hood.name} — perfect for pickup runs, team practices, birthday parties, and private events. Pick a time, book online, show up and play.`}
      breadcrumbs={[
        { href: '/', label: 'Home' },
        { label: 'Los Angeles' },
        { href: '/los-angeles/basketball-courts', label: 'Basketball Courts' },
        { label: hood.name },
      ]}
    >
      <JsonLd id={`la-basketball-${hood.slug}-jsonld`} data={itemListJsonLd} />
      <LandingVenueGrid venues={venues} />
    </LandingPageShell>
  )
}
