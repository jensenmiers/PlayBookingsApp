import Link from 'next/link'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { groupVenuesByNeighborhood, loadVenuesForCategory } from '@/lib/landingVenues'
import { LandingPageShell } from '@/components/seo/landing-page-shell'
import { LandingVenueGrid } from '@/components/seo/landing-venue-grid'
import { findCityLanding, type IntentLandingRoute } from '@/lib/seoLandingRoutes'

export async function IntentLandingPage({ route }: { route: IntentLandingRoute }) {
  const supabase = createPublicServerClient()
  const venues = await loadVenuesForCategory(supabase, route.category)
  const groups = groupVenuesByNeighborhood(venues)
  const canonicalCity = findCityLanding('los-angeles', route.category)

  return (
    <LandingPageShell
      h1={route.h1}
      intro={route.intro}
      breadcrumbs={[{ href: '/', label: 'Home' }, { label: 'Los Angeles' }, { label: route.h1 }]}
    >
      {canonicalCity ? (
        <p className="mb-6 text-sm text-secondary-50/60">
          Prefer to browse by neighborhood?{' '}
          <Link href={canonicalCity.path} className="text-primary-400 hover:text-primary-300">
            See our full LA {route.category === 'gym-rentals' ? 'gym rental' : 'basketball court'} directory →
          </Link>
        </p>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-secondary-50/60">No active listings yet — check back soon.</p>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.slug}>
              <h2 className="mb-4 text-2xl font-semibold">{group.name}</h2>
              <LandingVenueGrid venues={group.venues} />
            </section>
          ))}
        </div>
      )}
    </LandingPageShell>
  )
}
