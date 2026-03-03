#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

type NextAvailableRow = {
  venue_id: string
  venue_name: string
  next_slot_id: string | null
  next_slot_date: string | null
  next_slot_start_time: string | null
  next_slot_end_time: string | null
}

type RegularAvailableSlotRow = {
  venue_id: string
  slot_id: string
  slot_date: string
  start_time: string
  end_time: string
}

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function sortRegularSlots(rows: RegularAvailableSlotRow[]): RegularAvailableSlotRow[] {
  return [...rows].sort((left, right) => {
    if (left.slot_date !== right.slot_date) {
      return left.slot_date.localeCompare(right.slot_date)
    }
    return left.start_time.localeCompare(right.start_time)
  })
}

async function main() {
  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )

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
  const rowsWithNextSlot = allRows.filter((row) => Boolean(row.next_slot_id))

  console.log(`Venues returned by RPC: ${allRows.length}`)
  console.log(`Venues with next_slot_id: ${rowsWithNextSlot.length}`)

  const mismatches: Array<{
    venue_id: string
    venue_name: string
    reason:
      | 'rpc_has_next_but_regular_empty'
      | 'rpc_missing_next_but_regular_has_slot'
      | 'slot_id_mismatch'
    rpc_next_slot_id: string | null
    regular_first_slot_id: string | null
  }> = []

  for (const row of allRows) {
    const { data: regularRows, error: regularRowsError } = await supabase.rpc(
      'get_regular_available_slot_instances',
      {
        p_venue_id: row.venue_id,
        p_date_from: null,
        p_date_to: null,
        p_date_filter: null,
      }
    )

    if (regularRowsError) {
      throw new Error(
        `Failed to fetch regular available slots for venue ${row.venue_id}: ${regularRowsError.message}`
      )
    }

    const sortedRegularRows = sortRegularSlots((regularRows || []) as RegularAvailableSlotRow[])
    const firstRegular = sortedRegularRows[0] || null
    const rpcNextSlotId = row.next_slot_id || null
    const regularFirstSlotId = firstRegular?.slot_id || null
    let reason: 'rpc_has_next_but_regular_empty' | 'rpc_missing_next_but_regular_has_slot' | 'slot_id_mismatch' | null = null

    if (rpcNextSlotId && !regularFirstSlotId) {
      reason = 'rpc_has_next_but_regular_empty'
    } else if (!rpcNextSlotId && regularFirstSlotId) {
      reason = 'rpc_missing_next_but_regular_has_slot'
    } else if (rpcNextSlotId && regularFirstSlotId && rpcNextSlotId !== regularFirstSlotId) {
      reason = 'slot_id_mismatch'
    }

    if (reason) {
      mismatches.push({
        venue_id: row.venue_id,
        venue_name: row.venue_name,
        reason,
        rpc_next_slot_id: rpcNextSlotId,
        regular_first_slot_id: regularFirstSlotId,
      })
    }
  }

  if (mismatches.length > 0) {
    console.log(`Parity mismatches found: ${mismatches.length}`)
    for (const mismatch of mismatches) {
      console.log(
        `- ${mismatch.venue_name} (${mismatch.venue_id}) reason=${mismatch.reason} rpc=${mismatch.rpc_next_slot_id} regular_first=${mismatch.regular_first_slot_id}`
      )
    }
    process.exit(1)
  }

  console.log('Parity check passed: each next-available slot matches first regular available slot.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Validation failed: ${message}`)
  process.exit(1)
})
