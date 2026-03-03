#!/usr/bin/env tsx

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { syncDueVenueCalendars } from '../src/services/googleCalendarIntegrationService'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const limit = Number(process.argv[2] || '25')

async function main() {
  const results = await syncDueVenueCalendars(limit)
  console.log(`Processed ${results.length} venue calendar integration(s)`)

  for (const result of results) {
    if (result.ok) {
      console.log(
        `- ${result.venueId}: ok (upserts=${result.upsertedCount || 0}, cancelled=${result.cancelledCount || 0})`
      )
      continue
    }
    console.log(`- ${result.venueId}: failed (${result.error || 'unknown error'})`)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Unexpected failure: ${message}`)
  process.exit(1)
})
