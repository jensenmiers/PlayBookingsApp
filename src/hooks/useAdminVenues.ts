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
  regular_slot_sync: AdminTemplateSyncState
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
): Promise<AdminVenueConfigItem> {
  const response = await fetch(`/api/admin/venues/${venueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || 'Failed to update venue config')
  }

  return result.data as AdminVenueConfigItem
}
