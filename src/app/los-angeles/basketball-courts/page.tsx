import Link from 'next/link'
import type { Metadata } from 'next'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { findCityLanding } from '@/lib/seoLandingRoutes'
import { groupVenuesByNeighborhood, loadVenuesForCategory } from '@/lib/landingVenues'
import { LandingPageShell } from '@/components/seo/landing-page-shell'
import { LandingVenueGrid } from '@/components/seo/landing-venue-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { SITE_ORIGIN } from '@/lib/venueSeo'

export const revalidate = 600

const ROUTE = findCityLanding('los-angeles', 'basketball-courts')!

export const metadata: Metadata = {
  title: ROUTE.title,
  description: ROUTE.description,
  alternates: { canonical: ROUTE.path },
  openGraph: {
    title: ROUTE.title,
    description: ROUTE.description,
    url: ROUTE.path,
    type: 'website',
  },
}

export default async function LaBasketballCourtsPage() {
  const supabase = createPublicServerClient()
  const venues = await loadVenuesForCategory(supabase, 'basketball-courts')
  const groups = groupVenuesByNeighborhood(venues)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ROUTE.h1,
    itemListElement: groups.map((group, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Basketball courts in ${group.name}`,
      url: `${SITE_ORIGIN}${ROUTE.path}/${group.slug}`,
    })),
  }

  return (
    <LandingPageShell
      h1={ROUTE.h1}
      intro={ROUTE.intro}
      breadcrumbs={[{ href: '/', label: 'Home' }, { label: 'Los Angeles' }, { label: 'Basketball Courts' }]}
    >
      <JsonLd id="la-basketball-courts-jsonld" data={itemListJsonLd} />

      {groups.length === 0 ? (
        <p className="text-secondary-50/60">No active courts yet — check back soon.</p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-xl font-semibold">Browse by neighborhood</h2>
            <ul className="flex flex-wrap gap-xs">
              {groups.map((group) => (
                <li key={group.slug}>
                  <Link
                    href={`${ROUTE.path}/${group.slug}`}
                    className="inline-flex items-center rounded-full border border-secondary-50/20 px-m py-xs text-sm transition-colors hover:border-primary-400 hover:text-primary-400"
                  >
                    {group.name} ({group.venues.length})
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {groups.map((group) => (
            <section key={group.slug}>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-semibold">
                  Basketball courts in {group.name}
                </h2>
                <Link
                  href={`${ROUTE.path}/${group.slug}`}
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  See all →
                </Link>
              </div>
              <LandingVenueGrid venues={group.venues.slice(0, 6)} />
            </section>
          ))}
        </div>
      )}
    </LandingPageShell>
  )
}
