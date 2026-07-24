/**
 * Venues next-available discovery API
 * GET /api/venues/next-available
 */

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import {
  buildMapVenuesFromDiscovery,
  type MapVenue,
  type VenueDiscoveryEnrichmentRow,
  type VenueDiscoveryRpcRow,
} from '@/lib/venueDiscovery'
import {
  isMissingVenueMediaQueryError,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'
import { matchesAccessFilter, parseVenueAccessFilter } from '@/lib/venueAccess'

function parseOptionalNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const searchParams = new URL(request.url).searchParams
    const dateFilter = searchParams.get('date')?.trim() || null
    const userLat = parseOptionalNumber(searchParams.get('lat'))
    const userLng = parseOptionalNumber(searchParams.get('lng'))
    const radiusMiles = parseOptionalNumber(searchParams.get('radiusMiles'))
    const access = parseVenueAccessFilter(searchParams.get('access') || 'all')

    const { data: rpcRows, error: rpcError } = await supabase.rpc(
      'get_venues_with_next_available',
      {
        p_date_filter: dateFilter,
        p_user_lat: userLat,
        p_user_lng: userLng,
        p_radius_miles: radiusMiles,
        p_access_filter: access,
      }
    )

    if (rpcError) {
      throw rpcError
    }

    const discoveryRows = (rpcRows || []) as VenueDiscoveryRpcRow[]
    const venueIds = discoveryRows.map((row) => row.venue_id)

    let enrichmentRows: VenueDiscoveryEnrichmentRow[] = []

    if (venueIds.length > 0) {
      const mediaQuery = await supabase
        .from('venues')
        .select(VENUE_SELECT_WITH_MEDIA)
        .in('id', venueIds)

      if (mediaQuery.error && isMissingVenueMediaQueryError(mediaQuery.error)) {
        const fallbackQuery = await supabase
          .from('venues')
          .select('id, venue_type, photos')
          .in('id', venueIds)

        if (fallbackQuery.error) {
          console.error(
            'Venue enrichment fallback failed; returning discovery rows with defaults:',
            fallbackQuery.error
          )
        } else {
          enrichmentRows = (fallbackQuery.data || []) as unknown as VenueDiscoveryEnrichmentRow[]
        }
      } else if (mediaQuery.error) {
        console.error(
          'Venue enrichment failed; returning discovery rows with defaults:',
          mediaQuery.error
        )
      } else {
        enrichmentRows = (mediaQuery.data || []) as unknown as VenueDiscoveryEnrichmentRow[]
      }
    }

    const venues = buildMapVenuesFromDiscovery(discoveryRows, enrichmentRows).filter((venue) =>
      matchesAccessFilter(
        {
          offers_open_gym: venue.offersOpenGym,
          offers_private_rental: venue.offersPrivateRental,
        },
        access
      )
    )
    const response: ApiResponse<MapVenue[]> = {
      success: true,
      data: venues,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
