import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleApiError } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { ApiResponse } from '@/types/api'
import type { DropInTemplateWindow, Venue, VenueAdminConfig } from '@/types'

const REGULAR_TEMPLATE_NAME_PREFIX = 'Regular Booking Window '

type SlotTemplateRow = {
  venue_id: string
  name: string
  action_type: 'instant_book' | 'request_private' | 'info_only_open_gym'
  day_of_week: number
  start_time: string
  end_time: string
}

type RegularTemplateSyncQueueRow = {
  venue_id: string
  reason: string | null
  run_after: string | null
  last_error: string | null
  updated_at: string | null
}

type DropInTemplateSyncQueueRow = {
  venue_id: string
  reason: string | null
  run_after: string | null
  last_error: string | null
  updated_at: string | null
}

type TemplateSyncState = {
  status: 'synced' | 'pending' | 'failed'
  reason: string | null
  run_after: string | null
  last_error: string | null
  updated_at: string | null
}

type AdminVenueConfigListItem = {
  venue: Venue
  config: VenueAdminConfig
  drop_in_templates: DropInTemplateWindow[]
  regular_booking_templates: DropInTemplateWindow[]
  drop_in_slot_sync: TemplateSyncState
  regular_slot_sync: TemplateSyncState
  completeness: {
    score: number
    missing_fields: string[]
  }
}

function normalizeTemplateWindows(rawTemplates: DropInTemplateWindow[]): DropInTemplateWindow[] {
  const unique = new Map<string, DropInTemplateWindow>()
  for (const template of rawTemplates) {
    const window = {
      day_of_week: Number(template.day_of_week),
      start_time: template.start_time,
      end_time: template.end_time,
    }
    unique.set(`${window.day_of_week}-${window.start_time}-${window.end_time}`, window)
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.day_of_week !== right.day_of_week) {
      return left.day_of_week - right.day_of_week
    }
    return left.start_time.localeCompare(right.start_time)
  })
}

function toSyncState(row: RegularTemplateSyncQueueRow | null): TemplateSyncState {
  if (!row) {
    return {
      status: 'synced',
      reason: null,
      run_after: null,
      last_error: null,
      updated_at: null,
    }
  }

  return {
    status: row.last_error ? 'failed' : 'pending',
    reason: row.reason,
    run_after: row.run_after,
    last_error: row.last_error,
    updated_at: row.updated_at,
  }
}

export async function GET(): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const adminClient = createAdminClient()

    const [
      { data: venues, error: venuesError },
      { data: configRows, error: configsError },
      { data: templateRows, error: templatesError },
      { data: regularSyncRows, error: regularSyncError },
      { data: dropInSyncRows, error: dropInSyncError },
    ] = await Promise.all([
      adminClient
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),
      adminClient
        .from('venue_admin_configs')
        .select('*'),
      adminClient
        .from('slot_templates')
        .select('venue_id, name, action_type, day_of_week, start_time, end_time')
        .in('action_type', ['info_only_open_gym', 'instant_book', 'request_private'])
        .eq('is_active', true),
      adminClient
        .from('regular_template_sync_queue')
        .select('venue_id, reason, run_after, last_error, updated_at'),
      adminClient
        .from('drop_in_template_sync_queue')
        .select('venue_id, reason, run_after, last_error, updated_at'),
    ])

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`)
    }

    if (configsError) {
      throw new Error(`Failed to fetch venue configs: ${configsError.message}`)
    }
    if (templatesError) {
      throw new Error(`Failed to fetch slot templates: ${templatesError.message}`)
    }

    const isMissingRegularSyncTable = regularSyncError?.code === '42P01'
      || regularSyncError?.message?.toLowerCase().includes('regular_template_sync_queue')
    if (regularSyncError && !isMissingRegularSyncTable) {
      throw new Error(`Failed to fetch regular sync queue: ${regularSyncError.message}`)
    }
    const isMissingDropInSyncTable = dropInSyncError?.code === '42P01'
      || dropInSyncError?.message?.toLowerCase().includes('drop_in_template_sync_queue')
    if (dropInSyncError && !isMissingDropInSyncTable) {
      throw new Error(`Failed to fetch drop-in sync queue: ${dropInSyncError.message}`)
    }

    const configByVenueId = new Map<string, Partial<VenueAdminConfig>>()
    for (const row of (configRows || []) as Partial<VenueAdminConfig>[]) {
      if (row.venue_id) {
        configByVenueId.set(row.venue_id, row)
      }
    }

    const dropInTemplatesByVenueId = new Map<string, DropInTemplateWindow[]>()
    const regularTemplatesByVenueId = new Map<string, DropInTemplateWindow[]>()
    for (const row of (templateRows || []) as SlotTemplateRow[]) {
      const templateWindow = {
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time,
        end_time: row.end_time,
      }

      if (row.action_type === 'info_only_open_gym') {
        const windows = dropInTemplatesByVenueId.get(row.venue_id) || []
        windows.push(templateWindow)
        dropInTemplatesByVenueId.set(row.venue_id, windows)
        continue
      }

      if (!row.name.startsWith(REGULAR_TEMPLATE_NAME_PREFIX)) {
        continue
      }

      const regularWindows = regularTemplatesByVenueId.get(row.venue_id) || []
      regularWindows.push(templateWindow)
      regularTemplatesByVenueId.set(row.venue_id, regularWindows)
    }

    const regularSyncByVenueId = new Map<string, RegularTemplateSyncQueueRow>()
    if (!isMissingRegularSyncTable) {
      for (const row of (regularSyncRows || []) as RegularTemplateSyncQueueRow[]) {
        regularSyncByVenueId.set(row.venue_id, row)
      }
    }
    const dropInSyncByVenueId = new Map<string, DropInTemplateSyncQueueRow>()
    if (!isMissingDropInSyncTable) {
      for (const row of (dropInSyncRows || []) as DropInTemplateSyncQueueRow[]) {
        dropInSyncByVenueId.set(row.venue_id, row)
      }
    }

    const items: AdminVenueConfigListItem[] = ((venues || []) as Venue[]).map((venue) => {
      const config = normalizeVenueAdminConfig(venue.id, configByVenueId.get(venue.id) || null)
      const completeness = calculateVenueConfigCompleteness(venue, config)
      const dropInTemplates = normalizeTemplateWindows(dropInTemplatesByVenueId.get(venue.id) || [])
      const regularBookingTemplates = normalizeTemplateWindows(regularTemplatesByVenueId.get(venue.id) || [])
      const dropInSlotSync = toSyncState(dropInSyncByVenueId.get(venue.id) || null)
      const regularSlotSync = toSyncState(regularSyncByVenueId.get(venue.id) || null)
      return {
        venue,
        config,
        drop_in_templates: dropInTemplates,
        regular_booking_templates: regularBookingTemplates,
        drop_in_slot_sync: dropInSlotSync,
        regular_slot_sync: regularSlotSync,
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
