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

async function main() {
  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )

  const [{ data: venues, error: venuesError }, { data: configs, error: configsError }] = await Promise.all([
    supabase.from('venues').select('id').eq('is_active', true),
    supabase.from('venue_admin_configs').select('venue_id, regular_schedule_mode'),
  ])

  if (venuesError) {
    throw new Error(`Failed to fetch venues: ${venuesError.message}`)
  }
  if (configsError) {
    throw new Error(`Failed to fetch venue_admin_configs: ${configsError.message}`)
  }

  const activeVenueIds = new Set((venues || []).map((venue) => venue.id as string))
  const configByVenueId = new Map<string, string | null>()
  for (const row of configs || []) {
    configByVenueId.set(row.venue_id as string, (row.regular_schedule_mode as string | null) || null)
  }

  const nonTemplateVenueIds: string[] = []
  for (const venueId of activeVenueIds) {
    const mode = configByVenueId.get(venueId)
    if (mode !== 'template') {
      nonTemplateVenueIds.push(venueId)
    }
  }

  console.log(`Active venues checked: ${activeVenueIds.size}`)
  console.log(`Non-template venues found: ${nonTemplateVenueIds.length}`)
  if (nonTemplateVenueIds.length > 0) {
    console.log('Venue IDs not in template mode:')
    for (const venueId of nonTemplateVenueIds) {
      console.log(`- ${venueId}`)
    }
    process.exit(1)
  }

  console.log('All active venues are in template mode.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Validation failed: ${message}`)
  process.exit(1)
})
