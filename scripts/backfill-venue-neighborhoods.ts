#!/usr/bin/env tsx
/**
 * One-off backfill: populate venues.neighborhood + venues.neighborhood_slug
 * from each row's address/coordinates using the LA neighborhood lookup.
 *
 * Run after the 20260421000100_add_venue_neighborhood.sql migration is applied:
 *   npx tsx scripts/backfill-venue-neighborhoods.ts
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { resolveLaNeighborhood } from '../src/lib/laNeighborhoods'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address, latitude, longitude, neighborhood_slug')

  if (error) {
    console.error('Failed to fetch venues:', error)
    process.exit(1)
  }

  const rows = data ?? []
  console.log(`Loaded ${rows.length} venues`)

  const counts: Record<string, number> = {}
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const hood = resolveLaNeighborhood({
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    })

    counts[hood.slug] = (counts[hood.slug] ?? 0) + 1

    if (row.neighborhood_slug === hood.slug) {
      skipped += 1
      continue
    }

    const { error: updateError } = await supabase
      .from('venues')
      .update({ neighborhood: hood.name, neighborhood_slug: hood.slug })
      .eq('id', row.id)

    if (updateError) {
      console.error(`  ✗ ${row.name}: ${updateError.message}`)
      continue
    }

    console.log(`  ✓ ${row.name} -> ${hood.name}`)
    updated += 1
  }

  console.log('\nDistribution:')
  for (const [slug, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug.padEnd(22)} ${count}`)
  }
  console.log(`\nUpdated: ${updated}  Already correct: ${skipped}  Total: ${rows.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
