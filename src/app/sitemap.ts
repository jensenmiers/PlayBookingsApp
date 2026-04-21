import type { MetadataRoute } from 'next'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { slugifyVenueName } from '@/lib/venuePage'
import { SITE_ORIGIN } from '@/lib/venueSeo'
import { CITY_LANDING_ROUTES, INTENT_LANDING_ROUTES } from '@/lib/seoLandingRoutes'

export const revalidate = 3600

type VenueRow = {
  name: string
  neighborhood_slug: string | null
  venue_type: string | null
  updated_at: string | null
}

function absolute(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

function isGymType(venueType: string | null): boolean {
  if (!venueType) return false
  return /gym|gymnasium|fieldhouse|studio/i.test(venueType)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absolute('/'), changeFrequency: 'daily', priority: 1.0, lastModified: now },
    { url: absolute('/search'), changeFrequency: 'daily', priority: 0.8, lastModified: now },
    { url: absolute('/venues'), changeFrequency: 'daily', priority: 0.8, lastModified: now },
    { url: absolute('/become-a-host'), changeFrequency: 'weekly', priority: 0.5, lastModified: now },
    { url: absolute('/privacy'), changeFrequency: 'yearly', priority: 0.3, lastModified: now },
  ]

  const landingEntries: MetadataRoute.Sitemap = [
    ...CITY_LANDING_ROUTES.map((r) => ({
      url: absolute(r.path),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      lastModified: now,
    })),
    ...INTENT_LANDING_ROUTES.map((r) => ({
      url: absolute(r.path),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      lastModified: now,
    })),
  ]

  let venueEntries: MetadataRoute.Sitemap = []
  const neighborhoodByCategory: Record<'basketball-courts' | 'gym-rentals', Set<string>> = {
    'basketball-courts': new Set(),
    'gym-rentals': new Set(),
  }

  try {
    const supabase = createPublicServerClient()
    const { data, error } = await supabase
      .from('venues')
      .select('name, neighborhood_slug, venue_type, updated_at')
      .eq('is_active', true)

    if (!error && Array.isArray(data)) {
      const rows = data as VenueRow[]
      venueEntries = rows.map((row) => ({
        url: absolute(`/venue/${slugifyVenueName(row.name)}`),
        changeFrequency: 'daily' as const,
        priority: 0.7,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
      }))

      for (const row of rows) {
        if (!row.neighborhood_slug) continue
        const bucket = isGymType(row.venue_type) ? 'gym-rentals' : 'basketball-courts'
        neighborhoodByCategory[bucket].add(row.neighborhood_slug)
      }
    }
  } catch (err) {
    console.error('sitemap: failed to load venues', err)
  }

  const neighborhoodEntries: MetadataRoute.Sitemap = [
    ...Array.from(neighborhoodByCategory['basketball-courts']).map((slug) => ({
      url: absolute(`/los-angeles/basketball-courts/${slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
      lastModified: now,
    })),
    ...Array.from(neighborhoodByCategory['gym-rentals']).map((slug) => ({
      url: absolute(`/los-angeles/gym-rentals/${slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
      lastModified: now,
    })),
  ]

  return [...staticEntries, ...landingEntries, ...neighborhoodEntries, ...venueEntries]
}
