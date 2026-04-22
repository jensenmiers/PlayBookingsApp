import type { SupabaseClient } from '@supabase/supabase-js'
import type { Venue } from '@/types'
import {
  VENUE_SELECT_WITH_MEDIA,
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  type VenueWithOptionalMediaFields,
} from '@/lib/venueMedia'
import type { VenueCategory } from '@/lib/seoLandingRoutes'
import { isGymVenueType } from '@/lib/venueSeo'

type VenueRow = Venue & VenueWithOptionalMediaFields

export function matchesCategory(venueType: string | null | undefined, category: VenueCategory): boolean {
  const isGym = isGymVenueType(venueType)
  return category === 'gym-rentals' ? isGym : !isGym
}

async function fetchActiveVenues(
  supabase: Pick<SupabaseClient, 'from'>,
  filter?: { neighborhoodSlug?: string }
): Promise<Venue[]> {
  const runQuery = async (select: string) => {
    let query = supabase
      .from('venues')
      .select(select)
      .eq('is_active', true)
    if (filter?.neighborhoodSlug) {
      query = query.eq('neighborhood_slug', filter.neighborhoodSlug)
    }
    return query
  }

  let rows: VenueRow[] = []
  try {
    const { data, error } = await runQuery(VENUE_SELECT_WITH_MEDIA)
    if (error) throw error
    rows = (data ?? []) as unknown as VenueRow[]
  } catch (error) {
    if (!isMissingVenueMediaQueryError(error as { code?: string; message?: string; details?: string })) {
      throw error
    }
    const { data, error: fallbackError } = await runQuery('*')
    if (fallbackError) throw fallbackError
    rows = (data ?? []) as unknown as VenueRow[]
  }

  return normalizeVenueCollectionWithMedia(rows) as Venue[]
}

export async function loadVenuesForCategory(
  supabase: Pick<SupabaseClient, 'from'>,
  category: VenueCategory
): Promise<Venue[]> {
  const all = await fetchActiveVenues(supabase)
  return all.filter((v) => matchesCategory(v.venue_type, category))
}

export async function loadVenuesForNeighborhood(
  supabase: Pick<SupabaseClient, 'from'>,
  neighborhoodSlug: string,
  category: VenueCategory
): Promise<Venue[]> {
  const rows = await fetchActiveVenues(supabase, { neighborhoodSlug })
  return rows.filter((v) => matchesCategory(v.venue_type, category))
}

export function groupVenuesByNeighborhood(venues: Venue[]): Array<{
  slug: string
  name: string
  venues: Venue[]
}> {
  const groups = new Map<string, { slug: string; name: string; venues: Venue[] }>()
  for (const venue of venues) {
    const slug = venue.neighborhood_slug ?? 'los-angeles'
    const name = venue.neighborhood ?? 'Los Angeles'
    const existing = groups.get(slug)
    if (existing) {
      existing.venues.push(venue)
    } else {
      groups.set(slug, { slug, name, venues: [venue] })
    }
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
}
