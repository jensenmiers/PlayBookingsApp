import { createAdminClient } from '@/lib/supabase/admin'

export type AvailabilityPublishErrorSource = 'slot_refresh' | 'google_block_sync'

export type VenueAvailabilityPublishStateRow = {
  venue_id: string
  last_published_at: string | null
  last_publish_error: string | null
  last_publish_error_source: AvailabilityPublishErrorSource | null
  updated_at?: string | null
}

export type TemplateSyncStateInput = {
  status: 'synced' | 'pending' | 'failed'
  last_error: string | null
}

export type CalendarIntegrationStatusInput = {
  status: 'disconnected' | 'connected' | 'error'
  google_calendar_id: string | null
} | null

export type DerivedAvailabilityPublishState = {
  status: 'ready_for_renters' | 'updating_future_availability' | 'needs_attention'
  last_published_at: string | null
  last_error: string | null
  last_error_source: AvailabilityPublishErrorSource | null
}

function shouldApplyGoogleError(calendarIntegration: CalendarIntegrationStatusInput): boolean {
  return Boolean(
    calendarIntegration
    && calendarIntegration.status !== 'disconnected'
    && calendarIntegration.google_calendar_id
  )
}

export function deriveVenueAvailabilityPublishState(args: {
  publishState: VenueAvailabilityPublishStateRow | null
  regularSlotSync: TemplateSyncStateInput
  dropInSlotSync: TemplateSyncStateInput
  calendarIntegration: CalendarIntegrationStatusInput
}): DerivedAvailabilityPublishState {
  const queueStates = [args.regularSlotSync, args.dropInSlotSync]
  const failedQueueState = queueStates.find((state) => state.status === 'failed' && state.last_error)
  const hasPendingBackfill = queueStates.some((state) => state.status === 'pending')
  const publishState = args.publishState
  const googleErrorApplies =
    publishState?.last_publish_error_source === 'google_block_sync'
    && shouldApplyGoogleError(args.calendarIntegration)
  const slotRefreshErrorApplies = publishState?.last_publish_error_source === 'slot_refresh'
  const publishStateErrorApplies = Boolean(
    publishState?.last_publish_error && (googleErrorApplies || slotRefreshErrorApplies)
  )

  if (publishStateErrorApplies) {
    return {
      status: 'needs_attention',
      last_published_at: publishState?.last_published_at || null,
      last_error: publishState?.last_publish_error || null,
      last_error_source: publishState?.last_publish_error_source || null,
    }
  }

  if (failedQueueState) {
    return {
      status: 'needs_attention',
      last_published_at: publishState?.last_published_at || null,
      last_error: failedQueueState.last_error,
      last_error_source: 'slot_refresh',
    }
  }

  if (hasPendingBackfill) {
    return {
      status: 'updating_future_availability',
      last_published_at: publishState?.last_published_at || null,
      last_error: null,
      last_error_source: null,
    }
  }

  return {
    status: 'ready_for_renters',
    last_published_at: publishState?.last_published_at || null,
    last_error: null,
    last_error_source: null,
  }
}

export async function getVenueAvailabilityPublishState(
  venueId: string
): Promise<VenueAvailabilityPublishStateRow | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venue_availability_publish_states')
    .select('venue_id, last_published_at, last_publish_error, last_publish_error_source, updated_at')
    .eq('venue_id', venueId)
    .maybeSingle()

  const isMissingTable = error?.code === '42P01'
    || error?.message?.toLowerCase().includes('venue_availability_publish_states')
  if (error && !isMissingTable) {
    throw new Error(`Failed to load venue availability publish state: ${error.message}`)
  }
  if (isMissingTable || !data) {
    return null
  }

  return data as VenueAvailabilityPublishStateRow
}

export async function listVenueAvailabilityPublishStates(): Promise<VenueAvailabilityPublishStateRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('venue_availability_publish_states')
    .select('venue_id, last_published_at, last_publish_error, last_publish_error_source, updated_at')

  const isMissingTable = error?.code === '42P01'
    || error?.message?.toLowerCase().includes('venue_availability_publish_states')
  if (error && !isMissingTable) {
    throw new Error(`Failed to load venue availability publish states: ${error.message}`)
  }
  if (isMissingTable || !data) {
    return []
  }

  return data as VenueAvailabilityPublishStateRow[]
}

export async function recordVenueAvailabilityPublishFailure(args: {
  venueId: string
  errorMessage: string
  errorSource: AvailabilityPublishErrorSource
}): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('venue_availability_publish_states')
    .upsert(
      {
        venue_id: args.venueId,
        last_publish_error: args.errorMessage,
        last_publish_error_source: args.errorSource,
      },
      { onConflict: 'venue_id' }
    )

  if (error) {
    throw new Error(`Failed to persist venue availability publish failure: ${error.message}`)
  }
}

export async function recordVenueAvailabilityPublishSuccess(args: {
  venueId: string
  errorSource?: AvailabilityPublishErrorSource
  publishedAt?: string
}): Promise<void> {
  const currentState = await getVenueAvailabilityPublishState(args.venueId)
  const shouldClearError = !args.errorSource
    || currentState?.last_publish_error_source === args.errorSource

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('venue_availability_publish_states')
    .upsert(
      {
        venue_id: args.venueId,
        last_published_at: args.publishedAt || new Date().toISOString(),
        last_publish_error: shouldClearError ? null : currentState?.last_publish_error || null,
        last_publish_error_source: shouldClearError
          ? null
          : (currentState?.last_publish_error_source || null),
      },
      { onConflict: 'venue_id' }
    )

  if (error) {
    throw new Error(`Failed to persist venue availability publish success: ${error.message}`)
  }
}
