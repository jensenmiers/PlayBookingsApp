import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateRequest } from '@/middleware/validationMiddleware'
import { updateVenueAdminConfigSchema } from '@/lib/validations/adminVenueConfig'
import { badRequest, handleApiError, notFound } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import { deriveRegularTemplateWindowsFromOperatingHours } from '@/lib/operatingHoursTemplates'
import { syncVenueCalendarByVenueId } from '@/services/googleCalendarIntegrationService'
import {
  deriveVenueAvailabilityPublishState,
  getVenueAvailabilityPublishState,
  recordVenueAvailabilityPublishFailure,
  recordVenueAvailabilityPublishSuccess,
} from '@/services/venueAvailabilityPublishService'
import {
  isMissingVenueMediaQueryError,
  normalizeVenueWithMedia,
  type VenueWithOptionalMediaFields,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'
import type { ApiResponse } from '@/types/api'
import type { DropInTemplateWindow, Venue, VenueAdminConfig } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }
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

type VenueCalendarIntegrationState = {
  provider: string
  google_calendar_id: string | null
  google_calendar_name: string | null
  google_account_email: string | null
  status: 'disconnected' | 'connected' | 'error'
  sync_enabled: boolean
  sync_interval_minutes: number
  last_synced_at: string | null
  next_sync_at: string | null
  last_error: string | null
  updated_at: string | null
}

type AvailabilityPublishState = ReturnType<typeof deriveVenueAvailabilityPublishState>

type RegularTemplateRow = DropInTemplateWindow & {
  action_type: 'instant_book' | 'request_private'
}

function isRegularActionType(
  actionType: SlotTemplateRow['action_type']
): actionType is RegularTemplateRow['action_type'] {
  return actionType === 'instant_book' || actionType === 'request_private'
}

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`
  }
  return value
}

function normalizeTemplateWindows(rawTemplates: DropInTemplateWindow[]): DropInTemplateWindow[] {
  const normalized = rawTemplates.map((template) => ({
    day_of_week: Number(template.day_of_week),
    start_time: normalizeTime(template.start_time),
    end_time: normalizeTime(template.end_time),
  }))

  const unique = new Map<string, DropInTemplateWindow>()
  for (const template of normalized) {
    const key = `${template.day_of_week}-${template.start_time}-${template.end_time}`
    unique.set(key, template)
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.day_of_week !== right.day_of_week) {
      return left.day_of_week - right.day_of_week
    }
    return left.start_time.localeCompare(right.start_time)
  })
}

function buildDropInTemplateRows(venueId: string, templates: DropInTemplateWindow[]) {
  return templates.map((template, index) => ({
    venue_id: venueId,
    name: `Drop-In Window ${index + 1}`,
    action_type: 'info_only_open_gym',
    day_of_week: template.day_of_week,
    start_time: template.start_time,
    end_time: template.end_time,
    slot_interval_minutes: 60,
    blocks_inventory: true,
    is_active: true,
    metadata: {},
  }))
}

function buildRegularTemplateRows(
  venueId: string,
  actionType: 'instant_book' | 'request_private',
  templates: DropInTemplateWindow[]
) {
  return templates.map((template, index) => ({
    venue_id: venueId,
    name: `${REGULAR_TEMPLATE_NAME_PREFIX}${index + 1}`,
    action_type: actionType,
    day_of_week: template.day_of_week,
    start_time: template.start_time,
    end_time: template.end_time,
    slot_interval_minutes: 60,
    blocks_inventory: false,
    is_active: true,
    metadata: {
      source: 'super_admin_regular_weekly_schedule',
    },
  }))
}

function templatesEqual(left: DropInTemplateWindow[], right: DropInTemplateWindow[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((template, index) => {
    const candidate = right[index]
    return (
      template.day_of_week === candidate.day_of_week
      && template.start_time === candidate.start_time
      && template.end_time === candidate.end_time
    )
  })
}

function extractDropInTemplates(rows: SlotTemplateRow[]): DropInTemplateWindow[] {
  return normalizeTemplateWindows(
    rows
      .filter((row) => row.action_type === 'info_only_open_gym')
      .map((row) => ({
        day_of_week: Number(row.day_of_week),
        start_time: row.start_time,
        end_time: row.end_time,
      }))
  )
}

function extractRegularTemplates(rows: SlotTemplateRow[]): RegularTemplateRow[] {
  const regularRows = rows.filter(
    (
      row
    ): row is SlotTemplateRow & { action_type: RegularTemplateRow['action_type'] } =>
      isRegularActionType(row.action_type)
  )

  const dedupedByWindow = new Map<string, RegularTemplateRow>()
  for (const row of regularRows) {
    const window: RegularTemplateRow = {
      day_of_week: Number(row.day_of_week),
      start_time: row.start_time,
      end_time: row.end_time,
      action_type: row.action_type,
    }
    dedupedByWindow.set(`${window.day_of_week}-${window.start_time}-${window.end_time}`, window)
  }

  return Array.from(dedupedByWindow.values()).sort((left, right) => {
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

const AVAILABILITY_AFFECTING_FIELDS = [
  'drop_in_enabled',
  'drop_in_price',
  'operating_hours',
  'drop_in_templates',
  'instant_booking',
  'insurance_required',
  'min_advance_booking_days',
  'min_advance_lead_time_hours',
  'blackout_dates',
  'holiday_dates',
] as const

function isAvailabilityAffectingSave(body: Record<string, unknown>): boolean {
  return AVAILABILITY_AFFECTING_FIELDS.some((field) => body[field] !== undefined)
}

function shouldRunImmediateGoogleSync(
  calendarIntegration: VenueCalendarIntegrationState | null
): boolean {
  return Boolean(
    calendarIntegration
    && calendarIntegration.status !== 'disconnected'
    && calendarIntegration.google_calendar_id
  )
}

function buildResponseMessage(args: {
  didRunAvailabilityPublish: boolean
  availabilityPublish: AvailabilityPublishState
}): string {
  if (!args.didRunAvailabilityPublish) {
    return 'Changes saved'
  }

  if (args.availabilityPublish.status === 'needs_attention') {
    return 'Changes saved. Renter availability needs attention.'
  }

  return 'Availability is live.'
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id } = await context.params
    if (!id) {
      throw badRequest('Venue id is required')
    }

    const adminClient = createAdminClient()

    const [
      venueResult,
      { data: configRow, error: configError },
      { data: templateRows, error: templateError },
      { data: regularSyncRow, error: regularSyncError },
      { data: dropInSyncRow, error: dropInSyncError },
      { data: calendarIntegrationRow, error: calendarIntegrationError },
      publishStateRow,
    ] = await Promise.all([
      adminClient.from('venues').select(VENUE_SELECT_WITH_MEDIA).eq('id', id).single(),
      adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
      adminClient
        .from('slot_templates')
        .select('venue_id, name, action_type, day_of_week, start_time, end_time')
        .eq('venue_id', id)
        .in('action_type', ['info_only_open_gym', 'instant_book', 'request_private'])
        .eq('is_active', true),
      adminClient
        .from('regular_template_sync_queue')
        .select('venue_id, reason, run_after, last_error, updated_at')
        .eq('venue_id', id)
        .maybeSingle(),
      adminClient
        .from('drop_in_template_sync_queue')
        .select('venue_id, reason, run_after, last_error, updated_at')
        .eq('venue_id', id)
        .maybeSingle(),
      adminClient
        .from('venue_calendar_integrations')
        .select('provider, google_calendar_id, google_calendar_name, google_account_email, status, sync_enabled, sync_interval_minutes, last_synced_at, next_sync_at, last_error, updated_at')
        .eq('venue_id', id)
        .maybeSingle(),
      getVenueAvailabilityPublishState(id),
    ])

    let { data: venue, error: venueError } = venueResult

    if (venueError && isMissingVenueMediaQueryError(venueError)) {
      ;({ data: venue, error: venueError } = await adminClient
        .from('venues')
        .select('*')
        .eq('id', id)
        .single())
    }

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }

    const venueRecord = venue as unknown as Venue & VenueWithOptionalMediaFields
    if (configError) {
      throw new Error(`Failed to fetch venue config: ${configError.message}`)
    }
    if (templateError) {
      throw new Error(`Failed to fetch slot templates: ${templateError.message}`)
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
    const isMissingCalendarIntegrationTable = calendarIntegrationError?.code === '42P01'
      || calendarIntegrationError?.message?.toLowerCase().includes('venue_calendar_integrations')
    if (calendarIntegrationError && !isMissingCalendarIntegrationTable) {
      throw new Error(`Failed to fetch calendar integration: ${calendarIntegrationError.message}`)
    }

    const config = normalizeVenueAdminConfig(id, configRow || null)
    const templates = (templateRows || []) as SlotTemplateRow[]
    const dropInTemplates = extractDropInTemplates(templates)
    const regularTemplates = extractRegularTemplates(templates).map((template) => ({
      day_of_week: template.day_of_week,
      start_time: template.start_time,
      end_time: template.end_time,
    }))
    const regularSlotSync = toSyncState(
      isMissingRegularSyncTable ? null : ((regularSyncRow as RegularTemplateSyncQueueRow | null) || null)
    )
    const dropInSlotSync = toSyncState(
      isMissingDropInSyncTable ? null : ((dropInSyncRow as DropInTemplateSyncQueueRow | null) || null)
    )
    const calendarIntegration = isMissingCalendarIntegrationTable
      ? null
      : ((calendarIntegrationRow as VenueCalendarIntegrationState | null) || null)
    const availabilityPublish = deriveVenueAvailabilityPublishState({
      publishState: publishStateRow,
      regularSlotSync,
      dropInSlotSync,
      calendarIntegration,
    })
    const normalizedVenue = normalizeVenueWithMedia(venueRecord)
    const completeness = calculateVenueConfigCompleteness(normalizedVenue as Venue, config)
    const response: ApiResponse<{
      venue: Venue
      config: VenueAdminConfig
      drop_in_templates: DropInTemplateWindow[]
      regular_booking_templates: DropInTemplateWindow[]
      drop_in_slot_sync: TemplateSyncState
      regular_slot_sync: TemplateSyncState
      calendar_integration: VenueCalendarIntegrationState | null
      availability_publish: AvailabilityPublishState
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: normalizedVenue as Venue,
        config,
        drop_in_templates: dropInTemplates,
        regular_booking_templates: regularTemplates,
        drop_in_slot_sync: dropInSlotSync,
        regular_slot_sync: regularSlotSync,
        calendar_integration: calendarIntegration,
        availability_publish: availabilityPublish,
        completeness,
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id } = await context.params
    if (!id) {
      throw badRequest('Venue id is required')
    }

    const body = await validateRequest(request, updateVenueAdminConfigSchema)
    if (body.regular_booking_templates !== undefined) {
      throw badRequest('regular_booking_templates is deprecated; update operating_hours instead')
    }
    const adminClient = createAdminClient()
    const shouldPublishAvailability = isAvailabilityAffectingSave(body as Record<string, unknown>)

    const [{ data: existingVenue, error: existingVenueError }, { data: existingConfig, error: existingConfigError }, { data: existingTemplateRows, error: existingTemplatesError }] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
        adminClient
          .from('slot_templates')
          .select('venue_id, name, action_type, day_of_week, start_time, end_time')
          .eq('venue_id', id)
          .in('action_type', ['info_only_open_gym', 'instant_book', 'request_private'])
          .eq('is_active', true),
      ])

    if (existingVenueError || !existingVenue) {
      throw notFound('Venue not found')
    }
    if (existingConfigError) {
      throw new Error(`Failed to fetch venue config before update: ${existingConfigError.message}`)
    }
    if (existingTemplatesError) {
      throw new Error(`Failed to fetch slot templates before update: ${existingTemplatesError.message}`)
    }

    const templatePatchValue = body.drop_in_templates as DropInTemplateWindow[] | undefined
    const nextDropInTemplates = templatePatchValue ? normalizeTemplateWindows(templatePatchValue) : null
    const operatingHoursPatchValue = body.operating_hours as VenueAdminConfig['operating_hours'] | undefined
    const derivedRegularTemplatesFromOperatingHours = operatingHoursPatchValue
      ? deriveRegularTemplateWindowsFromOperatingHours(operatingHoursPatchValue)
      : null
    const nextRegularTemplates = derivedRegularTemplatesFromOperatingHours
    const existingTemplates = (existingTemplateRows || []) as SlotTemplateRow[]
    const currentDropInTemplates = extractDropInTemplates(existingTemplates)
    const currentRegularTemplatesWithAction = extractRegularTemplates(existingTemplates)
    const currentRegularTemplates = currentRegularTemplatesWithAction.map((template) => ({
      day_of_week: template.day_of_week,
      start_time: template.start_time,
      end_time: template.end_time,
    }))
    const currentRegularScheduleMode = normalizeVenueAdminConfig(
      id,
      (existingConfig as Partial<VenueAdminConfig>) || null
    ).regular_schedule_mode

    const venueUpdates: Record<string, unknown> = {}
    const venueFields = [
      'hourly_rate',
      'instant_booking',
      'insurance_required',
      'amenities',
      'is_active',
    ] as const
    for (const field of venueFields) {
      if (body[field] !== undefined) {
        venueUpdates[field] = body[field]
      }
    }

    const configUpdates: Record<string, unknown> = {}
    const configFields = [
      'drop_in_enabled',
      'drop_in_price',
      'regular_schedule_mode',
      'min_advance_booking_days',
      'min_advance_lead_time_hours',
      'operating_hours',
      'blackout_dates',
      'holiday_dates',
      'policy_cancel',
      'policy_refund',
      'policy_reschedule',
      'policy_no_show',
      'policy_operating_hours_notes',
      'review_cadence_days',
      'last_reviewed_at',
    ] as const

    for (const field of configFields) {
      const value = body[field]
      if (value !== undefined) {
        configUpdates[field] = value
      }
    }

    if (body.mark_reviewed_now) {
      configUpdates.last_reviewed_at = new Date().toISOString()
    }

    const effectiveRegularActionType: 'instant_book' | 'request_private' =
      (body.instant_booking !== undefined ? body.instant_booking : existingVenue.instant_booking)
        ? 'instant_book'
        : 'request_private'

    const shouldStickTemplateMode =
      currentRegularScheduleMode === 'template'
      || derivedRegularTemplatesFromOperatingHours !== null
      || (nextRegularTemplates !== null && nextRegularTemplates.length > 0)
    if (shouldStickTemplateMode) {
      configUpdates.regular_schedule_mode = 'template'
    }

    if (
      Object.keys(venueUpdates).length === 0
      && Object.keys(configUpdates).length === 0
      && nextDropInTemplates === null
      && nextRegularTemplates === null
    ) {
      throw badRequest('No updates provided')
    }

    if (Object.keys(venueUpdates).length > 0) {
      const { error: venueUpdateError } = await adminClient
        .from('venues')
        .update(venueUpdates)
        .eq('id', id)

      if (venueUpdateError) {
        throw new Error(`Failed to update venue: ${venueUpdateError.message}`)
      }
    }

    if (Object.keys(configUpdates).length > 0) {
      const { error: configUpsertError } = await adminClient
        .from('venue_admin_configs')
        .upsert(
          {
            venue_id: id,
            ...configUpdates,
            updated_by: auth.userId,
          },
          { onConflict: 'venue_id' }
        )

      if (configUpsertError) {
        throw new Error(`Failed to update venue admin config: ${configUpsertError.message}`)
      }
    }

    let dropInTemplatesUpdated = false
    if (nextDropInTemplates && !templatesEqual(nextDropInTemplates, currentDropInTemplates)) {
      const { error: deleteTemplatesError } = await adminClient
        .from('slot_templates')
        .delete()
        .eq('venue_id', id)
        .eq('action_type', 'info_only_open_gym')

      if (deleteTemplatesError) {
        throw new Error(`Failed to replace drop-in templates: ${deleteTemplatesError.message}`)
      }

      if (nextDropInTemplates.length > 0) {
        const { error: insertTemplatesError } = await adminClient
          .from('slot_templates')
          .insert(buildDropInTemplateRows(id, nextDropInTemplates))

        if (insertTemplatesError) {
          throw new Error(`Failed to save drop-in templates: ${insertTemplatesError.message}`)
        }
      }

      dropInTemplatesUpdated = true
    }

    const actionTypeNeedsUpdate = currentRegularTemplatesWithAction.some(
      (template) => template.action_type !== effectiveRegularActionType
    )
    const shouldRefreshRegularTemplatesForBookingModeChange =
      currentRegularScheduleMode === 'template'
      && currentRegularTemplates.length > 0
      && (body.instant_booking !== undefined || actionTypeNeedsUpdate)
    const targetRegularTemplates =
      nextRegularTemplates ?? (shouldRefreshRegularTemplatesForBookingModeChange ? currentRegularTemplates : null)

    let regularTemplatesUpdated = false
    if (
      targetRegularTemplates
      && (
        !templatesEqual(targetRegularTemplates, currentRegularTemplates)
        || shouldRefreshRegularTemplatesForBookingModeChange
      )
    ) {
      const { error: deleteRegularTemplatesError } = await adminClient
        .from('slot_templates')
        .delete()
        .eq('venue_id', id)
        .in('action_type', ['instant_book', 'request_private'])

      if (deleteRegularTemplatesError) {
        throw new Error(`Failed to replace regular booking templates: ${deleteRegularTemplatesError.message}`)
      }

      if (targetRegularTemplates.length > 0) {
        const { error: insertRegularTemplatesError } = await adminClient
          .from('slot_templates')
          .insert(buildRegularTemplateRows(id, effectiveRegularActionType, targetRegularTemplates))

        if (insertRegularTemplatesError) {
          throw new Error(`Failed to save regular booking templates: ${insertRegularTemplatesError.message}`)
        }
      }

      regularTemplatesUpdated = true
    }

    const shouldQueueDropInSlotRefresh =
      dropInTemplatesUpdated || body.drop_in_enabled !== undefined || body.drop_in_price !== undefined
    const shouldQueueRegularSlotRefresh =
      regularTemplatesUpdated || shouldRefreshRegularTemplatesForBookingModeChange
    const shouldInlineRefreshSlotInstances = shouldQueueDropInSlotRefresh || shouldQueueRegularSlotRefresh
    let slotRefreshPublishError: string | null = null
    let googlePublishError: string | null = null

    if (shouldQueueDropInSlotRefresh) {
      const { error: queueError } = await adminClient.rpc('enqueue_drop_in_template_sync', {
        p_venue_id: id,
        p_reason: dropInTemplatesUpdated ? 'drop_in_templates_updated' : 'drop_in_policy_updated',
        p_delay_minutes: 0,
      })

      if (queueError) {
        slotRefreshPublishError = `Failed to queue drop-in slot sync: ${queueError.message}`
      }
    }

    if (shouldQueueRegularSlotRefresh) {
      const { error: regularQueueError } = await adminClient.rpc('enqueue_regular_template_sync', {
        p_venue_id: id,
        p_reason: regularTemplatesUpdated ? 'regular_templates_updated' : 'regular_policy_updated',
        p_delay_minutes: 0,
      })

      if (regularQueueError) {
        slotRefreshPublishError = `Failed to queue regular slot sync: ${regularQueueError.message}`
      }
    }

    if (slotRefreshPublishError) {
      await recordVenueAvailabilityPublishFailure({
        venueId: id,
        errorMessage: slotRefreshPublishError,
        errorSource: 'slot_refresh',
      })
    }

    if (shouldPublishAvailability && shouldInlineRefreshSlotInstances) {
      const { error: inlineRefreshError } = await adminClient.rpc('refresh_slot_instances_from_templates', {
        p_venue_id: id,
        p_date_from: new Date().toISOString().slice(0, 10),
        p_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      })

      if (inlineRefreshError) {
        slotRefreshPublishError = `Failed to refresh slot instances inline: ${inlineRefreshError.message}`
        await recordVenueAvailabilityPublishFailure({
          venueId: id,
          errorMessage: slotRefreshPublishError,
          errorSource: 'slot_refresh',
        })
      } else if (!slotRefreshPublishError) {
        await recordVenueAvailabilityPublishSuccess({
          venueId: id,
          errorSource: 'slot_refresh',
        })
      }
    }

    let immediateCalendarIntegrationRow: VenueCalendarIntegrationState | null = null
    if (shouldPublishAvailability) {
      const { data: calendarIntegrationRow, error: calendarIntegrationLoadError } = await adminClient
        .from('venue_calendar_integrations')
        .select('provider, google_calendar_id, google_calendar_name, google_account_email, status, sync_enabled, sync_interval_minutes, last_synced_at, next_sync_at, last_error, updated_at')
        .eq('venue_id', id)
        .maybeSingle()

      const isMissingCalendarIntegrationTable = calendarIntegrationLoadError?.code === '42P01'
        || calendarIntegrationLoadError?.message?.toLowerCase().includes('venue_calendar_integrations')
      if (calendarIntegrationLoadError && !isMissingCalendarIntegrationTable) {
        throw new Error(`Failed to load calendar integration for publish: ${calendarIntegrationLoadError.message}`)
      }
      immediateCalendarIntegrationRow = isMissingCalendarIntegrationTable
        ? null
        : ((calendarIntegrationRow as VenueCalendarIntegrationState | null) || null)

      if (shouldRunImmediateGoogleSync(immediateCalendarIntegrationRow)) {
        try {
          await syncVenueCalendarByVenueId({
            venueId: id,
            userId: auth.userId,
          })
        } catch (error) {
          googlePublishError = error instanceof Error ? error.message : 'Immediate Google Calendar sync failed'
        }
      } else if (!slotRefreshPublishError) {
        await recordVenueAvailabilityPublishSuccess({ venueId: id })
      }
    }

    const [
      { data: updatedVenue, error: updatedVenueError },
      { data: updatedConfigRow, error: updatedConfigError },
      { data: updatedTemplateRows, error: updatedTemplatesError },
      { data: updatedRegularSyncRow, error: updatedRegularSyncError },
      { data: updatedDropInSyncRow, error: updatedDropInSyncError },
      { data: updatedCalendarIntegrationRow, error: updatedCalendarIntegrationError },
      publishStateRow,
    ] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
        adminClient
          .from('slot_templates')
          .select('venue_id, name, action_type, day_of_week, start_time, end_time')
          .eq('venue_id', id)
          .in('action_type', ['info_only_open_gym', 'instant_book', 'request_private'])
          .eq('is_active', true),
        adminClient
          .from('regular_template_sync_queue')
          .select('venue_id, reason, run_after, last_error, updated_at')
          .eq('venue_id', id)
          .maybeSingle(),
        adminClient
          .from('drop_in_template_sync_queue')
          .select('venue_id, reason, run_after, last_error, updated_at')
          .eq('venue_id', id)
          .maybeSingle(),
        adminClient
          .from('venue_calendar_integrations')
          .select('provider, google_calendar_id, google_calendar_name, google_account_email, status, sync_enabled, sync_interval_minutes, last_synced_at, next_sync_at, last_error, updated_at')
          .eq('venue_id', id)
          .maybeSingle(),
        getVenueAvailabilityPublishState(id),
      ])

    if (updatedVenueError || !updatedVenue) {
      throw new Error(`Failed to refetch venue after update: ${updatedVenueError?.message || 'Unknown error'}`)
    }
    if (updatedConfigError) {
      throw new Error(`Failed to refetch venue config after update: ${updatedConfigError.message}`)
    }
    if (updatedTemplatesError) {
      throw new Error(`Failed to refetch slot templates after update: ${updatedTemplatesError.message}`)
    }
    const isMissingRegularSyncTable = updatedRegularSyncError?.code === '42P01'
      || updatedRegularSyncError?.message?.toLowerCase().includes('regular_template_sync_queue')
    if (updatedRegularSyncError && !isMissingRegularSyncTable) {
      throw new Error(`Failed to refetch regular sync state after update: ${updatedRegularSyncError.message}`)
    }
    const isMissingDropInSyncTable = updatedDropInSyncError?.code === '42P01'
      || updatedDropInSyncError?.message?.toLowerCase().includes('drop_in_template_sync_queue')
    if (updatedDropInSyncError && !isMissingDropInSyncTable) {
      throw new Error(`Failed to refetch drop-in sync state after update: ${updatedDropInSyncError.message}`)
    }
    const isMissingCalendarIntegrationTable = updatedCalendarIntegrationError?.code === '42P01'
      || updatedCalendarIntegrationError?.message?.toLowerCase().includes('venue_calendar_integrations')
    if (updatedCalendarIntegrationError && !isMissingCalendarIntegrationTable) {
      throw new Error(`Failed to refetch calendar integration after update: ${updatedCalendarIntegrationError.message}`)
    }

    const normalizedConfig = normalizeVenueAdminConfig(id, (updatedConfigRow as Partial<VenueAdminConfig>) || null)
    const updatedTemplates = (updatedTemplateRows || []) as SlotTemplateRow[]
    const normalizedDropInTemplates = extractDropInTemplates(updatedTemplates)
    const normalizedRegularTemplates = extractRegularTemplates(updatedTemplates).map((template) => ({
      day_of_week: template.day_of_week,
      start_time: template.start_time,
      end_time: template.end_time,
    }))
    const normalizedRegularSync = toSyncState(
      isMissingRegularSyncTable
        ? null
        : ((updatedRegularSyncRow as RegularTemplateSyncQueueRow | null) || null)
    )
    const normalizedDropInSync = toSyncState(
      isMissingDropInSyncTable
        ? null
        : ((updatedDropInSyncRow as DropInTemplateSyncQueueRow | null) || null)
    )
    const normalizedCalendarIntegration = isMissingCalendarIntegrationTable
      ? null
      : ((updatedCalendarIntegrationRow as VenueCalendarIntegrationState | null) || null)
    const responsePublishState = (
      slotRefreshPublishError
        ? {
            venue_id: id,
            last_published_at: publishStateRow?.last_published_at || null,
            last_publish_error: slotRefreshPublishError,
            last_publish_error_source: 'slot_refresh' as const,
          }
        : googlePublishError
          ? {
              venue_id: id,
              last_published_at: publishStateRow?.last_published_at || null,
              last_publish_error: googlePublishError,
              last_publish_error_source: 'google_block_sync' as const,
            }
          : publishStateRow
    ) || null
    const availabilityPublish = deriveVenueAvailabilityPublishState({
      publishState: responsePublishState,
      regularSlotSync: normalizedRegularSync,
      dropInSlotSync: normalizedDropInSync,
      calendarIntegration: normalizedCalendarIntegration,
    })

    const { error: auditError } = await adminClient
      .from('audit_logs')
      .insert({
        table_name: 'venue_admin_configs',
        record_id: id,
        action: 'update',
        old_values: {
          venue: existingVenue,
          config: existingConfig,
          drop_in_templates: currentDropInTemplates,
          regular_booking_templates: currentRegularTemplates,
        },
        new_values: {
          venue: updatedVenue,
          config: normalizedConfig,
          drop_in_templates: normalizedDropInTemplates,
          regular_booking_templates: normalizedRegularTemplates,
        },
        user_id: auth.userId,
      })

    if (auditError) {
      throw new Error(`Failed to write venue config audit log: ${auditError.message}`)
    }

    const completeness = calculateVenueConfigCompleteness(updatedVenue as Venue, normalizedConfig)
    const response: ApiResponse<{
      venue: Venue
      config: VenueAdminConfig
      drop_in_templates: DropInTemplateWindow[]
      regular_booking_templates: DropInTemplateWindow[]
      drop_in_slot_sync: TemplateSyncState
      regular_slot_sync: TemplateSyncState
      calendar_integration: VenueCalendarIntegrationState | null
      availability_publish: AvailabilityPublishState
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: updatedVenue as Venue,
        config: normalizedConfig,
        drop_in_templates: normalizedDropInTemplates,
        regular_booking_templates: normalizedRegularTemplates,
        drop_in_slot_sync: normalizedDropInSync,
        regular_slot_sync: normalizedRegularSync,
        calendar_integration: normalizedCalendarIntegration,
        availability_publish: availabilityPublish,
        completeness,
      },
      message: buildResponseMessage({
        didRunAvailabilityPublish: shouldPublishAvailability,
        availabilityPublish,
      }),
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
