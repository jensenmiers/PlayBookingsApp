import type { NextRequest } from 'next/server'
import { requireAuth } from '@/middleware/authMiddleware'
import { requireSuperAdmin } from '@/lib/superAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateRequest } from '@/middleware/validationMiddleware'
import { updateVenueAdminConfigSchema } from '@/lib/validations/adminVenueConfig'
import { badRequest, handleApiError, notFound } from '@/utils/errorHandling'
import { calculateVenueConfigCompleteness, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'
import type { ApiResponse } from '@/types/api'
import type { Venue, VenueAdminConfig } from '@/types'

type RouteContext = { params: Promise<{ id: string }> }

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`
  }
  return value
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

    const [{ data: venue, error: venueError }, { data: configRow, error: configError }] = await Promise.all([
      adminClient.from('venues').select('*').eq('id', id).single(),
      adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
    ])

    if (venueError || !venue) {
      throw notFound('Venue not found')
    }
    if (configError) {
      throw new Error(`Failed to fetch venue config: ${configError.message}`)
    }

    const config = normalizeVenueAdminConfig(id, configRow || null)
    const completeness = calculateVenueConfigCompleteness(venue as Venue, config)
    const response: ApiResponse<{
      venue: Venue
      config: VenueAdminConfig
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: venue as Venue,
        config,
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

    const [{ data: existingVenue, error: existingVenueError }, { data: existingConfig, error: existingConfigError }] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
      ])

    if (existingVenueError || !existingVenue) {
      throw notFound('Venue not found')
    }
    if (existingConfigError) {
      throw new Error(`Failed to fetch venue config before update: ${existingConfigError.message}`)
    }

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
      'policy_reschedule',
      'policy_no_show',
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

    if (Object.keys(venueUpdates).length === 0 && Object.keys(configUpdates).length === 0) {
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

    const [{ data: updatedVenue, error: updatedVenueError }, { data: updatedConfigRow, error: updatedConfigError }] =
      await Promise.all([
        adminClient.from('venues').select('*').eq('id', id).single(),
        adminClient.from('venue_admin_configs').select('*').eq('venue_id', id).maybeSingle(),
      ])

    if (updatedVenueError || !updatedVenue) {
      throw new Error(`Failed to refetch venue after update: ${updatedVenueError?.message || 'Unknown error'}`)
    }
    if (updatedConfigError) {
      throw new Error(`Failed to refetch venue config after update: ${updatedConfigError.message}`)
    }

    const normalizedConfig = normalizeVenueAdminConfig(id, (updatedConfigRow as Partial<VenueAdminConfig>) || null)

    const { error: auditError } = await adminClient
      .from('audit_logs')
      .insert({
        table_name: 'venue_admin_configs',
        record_id: id,
        action: 'update',
        old_values: {
          venue: existingVenue,
          config: existingConfig,
        },
        new_values: {
          venue: updatedVenue,
          config: normalizedConfig,
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
      completeness: ReturnType<typeof calculateVenueConfigCompleteness>
    }> = {
      success: true,
      data: {
        venue: updatedVenue as Venue,
        config: normalizedConfig,
        completeness,
      },
      message: 'Venue configuration updated',
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
