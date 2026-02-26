#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const limit = Number(process.argv[2] || '25')
const horizonDays = Number(process.argv[3] || '180')

async function main() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase.rpc('process_drop_in_template_sync_queue', {
    p_limit: Number.isInteger(limit) && limit > 0 ? limit : 25,
    p_horizon_days: Number.isInteger(horizonDays) && horizonDays > 0 ? horizonDays : 180,
  })

  if (error) {
    console.error(`Failed to process drop-in template sync queue: ${error.message}`)
    process.exit(1)
  }

  const rows = Array.isArray(data) ? data : []
  console.log(`Processed ${rows.length} venue(s) from drop-in template sync queue`)
  for (const row of rows as Array<{ venue_id: string; refreshed_rows: number }>) {
    console.log(`- ${row.venue_id}: refreshed ${row.refreshed_rows} slot instance row(s)`)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Unexpected failure: ${message}`)
  process.exit(1)
})
