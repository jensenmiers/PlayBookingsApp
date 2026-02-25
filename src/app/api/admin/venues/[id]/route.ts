import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateRequest } from '@/middleware/validationMiddleware'
import { updateVenueAdminConfigSchema } from '@/lib/validations/adminVenueConfig'
import { badRequest, handleApiError, notFound } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { ApiResponse } from '@/types/api'
import type { DropInTemplateWindow, Venue, VenueAdminConfig } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }
type DropInTemplateRow = {
  venue_id: string
  day_of_week: number
  start_time: string
  end_time: string
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

function normalizeDropInTemplates(rawTemplates: DropInTemplateWindow[]): DropInTemplateWindow[] {
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

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const auth = await requireAuth()
    requireSuperAdmin(auth)

    const { id } = await context.params
    if (!id) {
      throw badRequest('Venue id is required')
    }

    const adminClient = createAdminClient()

    const [{ data: venue, error: venueError }, { data: configRow, error: configError }, { data: templateRows, error: templateError }] = await Promise.all([
      adminClient.from('venues').select('*').eq('id', id).single(),
      adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
      adminClient
        .from('slot_templates')
        .select('venue_id, day_of_week, start_time, end_time')
        .eq('venue_id', id)
        .eq('action_type', 'info_only_open_gym')
        .eq('is_active', true),
    ])

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }
    if (configError) {
      throw new Error(`Failed to fetch venue config: ${configError.message}`)
    }
    if (templateError) {
      throw new Error(`Failed to fetch drop-in templates: ${templateError.message}`)
    }

    const config = normalizeVenueAdminConfig(id, configRow || null)
    const dropInTemplates = normalizeDropInTemplates((templateRows || []) as DropInTemplateWindow[])
    const completeness = calculateVenueConfigCompleteness(venue as Venue, config)
    const response: ApiResponse<{
      venue: Venue
      config: VenueAdminConfig
      drop_in_templates: DropInTemplateWindow[]
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: venue as Venue,
        config,
        drop_in_templates: dropInTemplates,
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
    const adminClient = createAdminClient()

    const [{ data: existingVenue, error: existingVenueError }, { data: existingConfig, error: existingConfigError }, { data: existingTemplateRows, error: existingTemplatesError }] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
        adminClient
          .from('slot_templates')
          .select('venue_id, day_of_week, start_time, end_time')
          .eq('venue_id', id)
          .eq('action_type', 'info_only_open_gym')
          .eq('is_active', true),
      ])

    if (existingVenueError || !existingVenue) {
      throw notFound('Venue not found')
    }
    if (existingConfigError) {
      throw new Error(`Failed to fetch venue config before update: ${existingConfigError.message}`)
    }
    if (existingTemplatesError) {
      throw new Error(`Failed to fetch drop-in templates before update: ${existingTemplatesError.message}`)
    }

    const templatePatchValue = body.drop_in_templates as DropInTemplateWindow[] | undefined
    const nextDropInTemplates = templatePatchValue ? normalizeDropInTemplates(templatePatchValue) : null
    const currentDropInTemplates = normalizeDropInTemplates((existingTemplateRows || []) as DropInTemplateRow[])

    const venueUpdates: Record<string, unknown> = {}
    const venueFields = [
      'hourly_rate',
      'instant_booking',
      'insurance_required',
      'max_advance_booking_days',
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
      'min_advance_lead_time_hours',
      'same_day_cutoff_time',
      'operating_hours',
      'blackout_dates',
      'holiday_dates',
      'insurance_requires_manual_approval',
      'insurance_document_types',
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
        if (field === 'same_day_cutoff_time' && typeof value === 'string') {
          configUpdates[field] = normalizeTime(value)
        } else {
          configUpdates[field] = value
        }
      }
    }

    if (body.mark_reviewed_now) {
      configUpdates.last_reviewed_at = new Date().toISOString()
    }

    if (Object.keys(venueUpdates).length === 0 && Object.keys(configUpdates).length === 0 && !nextDropInTemplates) {
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

    let templatesUpdated = false
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

      templatesUpdated = true
    }

    const shouldQueueSlotRefresh = templatesUpdated || body.drop_in_enabled !== undefined || body.drop_in_price !== undefined
    if (shouldQueueSlotRefresh) {
      const { error: queueError } = await adminClient.rpc('enqueue_drop_in_template_sync', {
        p_venue_id: id,
        p_reason: templatesUpdated ? 'drop_in_templates_updated' : 'drop_in_policy_updated',
        p_delay_minutes: 5,
      })

      if (queueError) {
        throw new Error(`Failed to queue drop-in slot sync: ${queueError.message}`)
      }
    }

    const [{ data: updatedVenue, error: updatedVenueError }, { data: updatedConfigRow, error: updatedConfigError }, { data: updatedTemplateRows, error: updatedTemplatesError }] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
        adminClient
          .from('slot_templates')
          .select('venue_id, day_of_week, start_time, end_time')
          .eq('venue_id', id)
          .eq('action_type', 'info_only_open_gym')
          .eq('is_active', true),
      ])

    if (updatedVenueError || !updatedVenue) {
      throw new Error(`Failed to refetch venue after update: ${updatedVenueError?.message || 'Unknown error'}`)
    }
    if (updatedConfigError) {
      throw new Error(`Failed to refetch venue config after update: ${updatedConfigError.message}`)
    }
    if (updatedTemplatesError) {
      throw new Error(`Failed to refetch drop-in templates after update: ${updatedTemplatesError.message}`)
    }

    const normalizedConfig = normalizeVenueAdminConfig(id, (updatedConfigRow as Partial<VenueAdminConfig>) || null)
    const normalizedTemplates = normalizeDropInTemplates((updatedTemplateRows || []) as DropInTemplateRow[])

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
        },
        new_values: {
          venue: updatedVenue,
          config: normalizedConfig,
          drop_in_templates: normalizedTemplates,
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
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: updatedVenue as Venue,
        config: normalizedConfig,
        drop_in_templates: normalizedTemplates,
        completeness,
      },
      message: 'Venue configuration updated',
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
