/**
 * Slot interaction API
 * POST /api/slot-interactions - Write non-blocking interaction events for slot UX analytics/audit
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest, createErrorResponse, internalError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

const ALLOWED_EVENT_TYPES = new Set(['slot_click', 'modal_open', 'modal_close', 'modal_cta'])

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw internalError('Server misconfiguration for slot interaction logging')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const slotInstanceId = body?.slot_instance_id
    const venueId = body?.venue_id
    const eventType = body?.event_type
    const metadata = body?.metadata

    if (!venueId || typeof venueId !== 'string') {
      throw badRequest('venue_id is required')
    }

    if (slotInstanceId !== null && slotInstanceId !== undefined && typeof slotInstanceId !== 'string') {
      throw badRequest('slot_instance_id must be a string when provided')
    }

    if (!eventType || typeof eventType !== 'string' || !ALLOWED_EVENT_TYPES.has(eventType)) {
      throw badRequest('event_type is invalid')
    }

    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
      throw badRequest('metadata must be an object when provided')
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('slot_interactions')
      .insert({
        slot_instance_id: slotInstanceId ?? null,
        venue_id: venueId,
        user_id: user?.id ?? null,
        event_type: eventType,
        metadata: metadata ?? {},
      })
      .select('id')
      .single()

    if (error) {
      throw internalError(`Failed to write slot interaction: ${error.message}`)
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: data.id as string },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const errorResponse = createErrorResponse(error)
    return NextResponse.json(errorResponse, { status: errorResponse.error.statusCode })
  }
}
