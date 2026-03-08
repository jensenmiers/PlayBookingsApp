'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DropInTemplateWindow, Venue, VenueAdminConfig } from '@/types'

export type AdminTemplateSyncStatus = 'synced' | 'pending' | 'failed'

export interface AdminTemplateSyncState {
  status: AdminTemplateSyncStatus
  reason: string | null
  run_after: string | null
  last_error: string | null
  updated_at: string | null
}

export interface AdminVenueConfigItem {
  venue: Venue
  config: VenueAdminConfig
  drop_in_templates: DropInTemplateWindow[]
  regular_booking_templates: DropInTemplateWindow[]
  drop_in_slot_sync: AdminTemplateSyncState
  regular_slot_sync: AdminTemplateSyncState
  calendar_integration?: {
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
  } | null
  availability_publish: {
    status: 'ready_for_renters' | 'updating_future_availability' | 'needs_attention'
    last_published_at: string | null
    last_error: string | null
    last_error_source: 'slot_refresh' | 'google_block_sync' | null
  }
  completeness: {
    score: number
    missing_fields: string[]
  }
}

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useAdminVenues() {
  const [state, setState] = useState<AsyncState<AdminVenueConfigItem[]>>({
    data: null,
    loading: true,
    error: null,
  })

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch('/api/admin/venues', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch admin venues')
      }

      setState({
        data: (result.data || []) as AdminVenueConfigItem[],
        loading: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch admin venues'
      setState({
        data: null,
        loading: false,
        error: message,
      })
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    ...state,
    refetch,
  }
}

export async function patchAdminVenueConfig(
  venueId: string,
  body: Record<string, unknown>
): Promise<{ item: AdminVenueConfigItem; message?: string }> {
  const response = await fetch(`/api/admin/venues/${venueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to update venue config')
  }

  return {
    item: result.data as AdminVenueConfigItem,
    message: typeof result.message === 'string' ? result.message : undefined,
  }
}

export async function connectVenueCalendar(venueId: string): Promise<{ auth_url: string }> {
  const response = await fetch(`/api/admin/venues/${venueId}/calendar/connect`, {
    method: 'POST',
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to start Google Calendar connection')
  }

  return result.data as { auth_url: string }
}

export async function getVenueCalendarStatus(
  venueId: string,
  includeCalendars = false
): Promise<{
  integration: AdminVenueConfigItem['calendar_integration'] | null
  calendars: Array<{ id: string; summary: string; primary: boolean }>
}> {
  const params = new URLSearchParams()
  if (includeCalendars) {
    params.set('include_calendars', '1')
  }
  const query = params.toString()
  const response = await fetch(
    `/api/admin/venues/${venueId}/calendar/status${query ? `?${query}` : ''}`,
    { cache: 'no-store' }
  )
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to fetch venue calendar status')
  }

  return result.data as {
    integration: AdminVenueConfigItem['calendar_integration'] | null
    calendars: Array<{ id: string; summary: string; primary: boolean }>
  }
}

export async function selectVenueCalendar(
  venueId: string,
  body: { calendar_id: string; calendar_name?: string | null }
): Promise<void> {
  const response = await fetch(`/api/admin/venues/${venueId}/calendar/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to select venue Google calendar')
  }
}

export async function syncVenueCalendarNow(venueId: string): Promise<{
  venueId: string
  upsertedCount: number
  cancelledCount: number
  syncedAt: string
  nextSyncAt: string
}> {
  const response = await fetch(`/api/admin/venues/${venueId}/calendar/sync`, {
    method: 'POST',
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to sync venue Google calendar')
  }

  return result.data as {
    venueId: string
    upsertedCount: number
    cancelledCount: number
    syncedAt: string
    nextSyncAt: string
  }
}

export async function disconnectVenueCalendar(venueId: string): Promise<void> {
  const response = await fetch(`/api/admin/venues/${venueId}/calendar/disconnect`, {
    method: 'POST',
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to disconnect venue Google calendar')
  }
}
