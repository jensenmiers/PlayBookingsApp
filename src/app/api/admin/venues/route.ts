import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleApiError } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { ApiResponse } from '@/types/api'
import type { DropInTemplateWindow, Venue, VenueAdminConfig } from '@/types'

type DropInTemplateRow = {
  venue_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

type AdminVenueConfigListItem = {
  venue: Venue
  config: VenueAdminConfig
  drop_in_templates: DropInTemplateWindow[]
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

    const [{ data: venues, error: venuesError }, { data: configRows, error: configsError }, { data: templateRows, error: templatesError }] = await Promise.all([
      adminClient
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),
      adminClient
        .from('venue_admin_configs')
        .select('*'),
      adminClient
        .from('slot_templates')
        .select('venue_id, day_of_week, start_time, end_time')
        .eq('action_type', 'info_only_open_gym')
        .eq('is_active', true),
    ])

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`)
    }

    if (configsError) {
      throw new Error(`Failed to fetch venue configs: ${configsError.message}`)
    }
    if (templatesError) {
      throw new Error(`Failed to fetch drop-in templates: ${templatesError.message}`)
    }

    const configByVenueId = new Map<string, Partial<VenueAdminConfig>>()
    for (const row of (configRows || []) as Partial<VenueAdminConfig>[]) {
      if (row.venue_id) {
        configByVenueId.set(row.venue_id, row)
      }
    }

    const templatesByVenueId = new Map<string, DropInTemplateWindow[]>()
    for (const row of (templateRows || []) as DropInTemplateRow[]) {
      const windows = templatesByVenueId.get(row.venue_id) || []
      windows.push({
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time,
        end_time: row.end_time,
      })
      templatesByVenueId.set(row.venue_id, windows)
    }

    const items: AdminVenueConfigListItem[] = ((venues || []) as Venue[]).map((venue) => {
      const config = normalizeVenueAdminConfig(venue.id, configByVenueId.get(venue.id) || null)
      const completeness = calculateVenueConfigCompleteness(venue, config)
      const dropInTemplates = (templatesByVenueId.get(venue.id) || [])
        .sort((left, right) => {
          if (left.day_of_week !== right.day_of_week) {
            return left.day_of_week - right.day_of_week
          }
          return left.start_time.localeCompare(right.start_time)
        })
      return {
        venue,
        config,
        drop_in_templates: dropInTemplates,
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
