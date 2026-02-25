import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleApiError } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { ApiResponse } from '@/types/api'
import type { Venue, VenueAdminConfig } from '@/types'

type AdminVenueConfigListItem = {
  venue: Venue
  config: VenueAdminConfig
  completeness: {
    score: number
    missing_fields: string[]
  }
}

export async function GET(): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const adminClient = createAdminClient()

    const [{ data: venues, error: venuesError }, { data: configRows, error: configsError }] = await Promise.all([
      adminClient
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),
      adminClient
        .from('venue_admin_configs')
        .select('*'),
    ])

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`)
    }

    if (configsError) {
      throw new Error(`Failed to fetch venue configs: ${configsError.message}`)
    }

    const configByVenueId = new Map<string, Partial<VenueAdminConfig>>()
    for (const row of (configRows || []) as Partial<VenueAdminConfig>[]) {
      if (row.venue_id) {
        configByVenueId.set(row.venue_id, row)
      }
    }

    const items: AdminVenueConfigListItem[] = ((venues || []) as Venue[]).map((venue) => {
      const config = normalizeVenueAdminConfig(venue.id, configByVenueId.get(venue.id) || null)
      const completeness = calculateVenueConfigCompleteness(venue, config)
      return {
        venue,
        config,
        completeness,
      }
    })

    const response: ApiResponse<AdminVenueConfigListItem[]> = {
      success: true,
      data: items,
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
