#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { AvailabilityService } from '@/services/availabilityService'
import { addDaysToDateString, getDateStringInTimeZone } from '@/utils/dateHelpers'
import type { SlotActionType } from '@/types'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const PLATFORM_TIME_ZONE = 'America/Los_Angeles'

type NextAvailableRow = {
  venue_id: string
  venue_name: string
  next_slot_id: string | null
  next_slot_action_type: SlotActionType | null
}

type MismatchReason =
  | 'rpc_has_next_but_combined_empty'
  | 'rpc_missing_next_but_combined_has_slot'
  | 'slot_id_mismatch'
  | 'action_type_mismatch'

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getTimeStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const byType = new Map(parts.map((part) => [part.type, part.value]))
  return `${byType.get('hour')}:${byType.get('minute')}:${byType.get('second')}`
}

async function main() {
  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )
  const availabilityService = new AvailabilityService({ getClient: async () => supabase })
  const now = new Date()
  const today = getDateStringInTimeZone(now, PLATFORM_TIME_ZONE)
  const nowTime = getTimeStringInTimeZone(now, PLATFORM_TIME_ZONE)
  const dateTo = addDaysToDateString(today, 365)

  const { data: nextRows, error: nextRowsError } = await supabase.rpc('get_venues_with_next_available', {
    p_date_filter: null,
    p_user_lat: null,
    p_user_lng: null,
    p_radius_miles: null,
  })

  if (nextRowsError) {
    throw new Error(`Failed to fetch next-available RPC rows: ${nextRowsError.message}`)
  }

  const allRows = (nextRows || []) as NextAvailableRow[]
  const mismatches: Array<{
    venue_id: string
    venue_name: string
    reason: MismatchReason
    rpc_next_slot_id: string | null
    combined_first_slot_id: string | null
  }> = []

  console.log(`Venues returned by RPC: ${allRows.length}`)
  console.log(`Venues with next_slot_id: ${allRows.filter((row) => Boolean(row.next_slot_id)).length}`)

  for (const row of allRows) {
    const availableSlots = await availabilityService.getAvailableSlots(row.venue_id, today, dateTo)
    const eligibleSlots = availableSlots
      .filter((slot) => (
        slot.action_type !== 'info_only_open_gym'
        || slot.date > today
        || (slot.date === today && slot.start_time >= nowTime)
      ))
      .sort((left, right) => {
        const timeComparison = `${left.date}-${left.start_time}`.localeCompare(`${right.date}-${right.start_time}`)
        if (timeComparison !== 0) return timeComparison
        if (left.action_type === right.action_type) {
          return (left.slot_instance_id || '').localeCompare(right.slot_instance_id || '')
        }
        return left.action_type === 'info_only_open_gym' ? 1 : -1
      })

    const firstEligible = eligibleSlots[0] || null
    const rpcNextSlotId = row.next_slot_id || null
    const combinedFirstSlotId = firstEligible?.slot_instance_id || null
    let reason: MismatchReason | null = null

    if (rpcNextSlotId && !combinedFirstSlotId) {
      reason = 'rpc_has_next_but_combined_empty'
    } else if (!rpcNextSlotId && combinedFirstSlotId) {
      reason = 'rpc_missing_next_but_combined_has_slot'
    } else if (rpcNextSlotId && combinedFirstSlotId && rpcNextSlotId !== combinedFirstSlotId) {
      reason = 'slot_id_mismatch'
    } else if (rpcNextSlotId && row.next_slot_action_type !== firstEligible?.action_type) {
      reason = 'action_type_mismatch'
    }

    if (reason) {
      mismatches.push({
        venue_id: row.venue_id,
        venue_name: row.venue_name,
        reason,
        rpc_next_slot_id: rpcNextSlotId,
        combined_first_slot_id: combinedFirstSlotId,
      })
    }
  }

  if (mismatches.length > 0) {
    console.log(`Parity mismatches found: ${mismatches.length}`)
    for (const mismatch of mismatches) {
      console.log(
        `- ${mismatch.venue_name} (${mismatch.venue_id}) reason=${mismatch.reason} rpc=${mismatch.rpc_next_slot_id} combined_first=${mismatch.combined_first_slot_id}`
      )
    }
    process.exit(1)
  }

  console.log('Parity check passed: every next-available result matches combined rental/open-gym availability.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Validation failed: ${message}`)
  process.exit(1)
})
