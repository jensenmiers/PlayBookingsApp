#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import {
  buildVenueGalleryPlan,
  parsePublishVenueGalleryArgs,
  runVenueGalleryPublish,
  slugifyVenueName,
} from '../src/lib/venueGalleryPublish'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function printUsage() {
  console.log('Usage:')
  console.log('  npm run venue-media:publish -- --venue "Venue Name" --source "/path/to/folder"')
  console.log('  npm run venue-media:publish -- --venue "Venue Name" --source "/path/to/folder" --apply')
  console.log('  npm run venue-media:publish -- --venue "Venue Name" --source "/path/to/folder" --apply --open-browser')
}

function extractStorageSlugFromMediaRow(row: { object_path?: string | null; public_url?: string | null } | null): string | null {
  const objectPath = row?.object_path?.split('?')[0] || null
  if (objectPath && objectPath.includes('/')) {
    return objectPath.split('/')[0] || null
  }

  const publicUrl = row?.public_url || ''
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/venue-photos\/([^/]+)\//)
  return match?.[1] || null
}

async function resolveVenue(args: {
  supabase: ReturnType<typeof createClient>
  venueName: string
}): Promise<{ id: string; name: string; slug: string }> {
  const { data: venue, error } = await args.supabase
    .from('venues')
    .select('id, name')
    .eq('name', args.venueName)
    .single()

  if (error || !venue) {
    throw new Error(`Venue not found: ${args.venueName}`)
  }

  const { data: existingMediaRows } = await args.supabase
    .from('venue_media')
    .select('object_path, public_url, sort_order')
    .eq('venue_id', venue.id)
    .order('sort_order', { ascending: true })
    .limit(1)

  const existingStorageSlug = extractStorageSlugFromMediaRow(existingMediaRows?.[0] || null)

  return {
    id: venue.id,
    name: venue.name,
    slug: existingStorageSlug || slugifyVenueName(venue.name),
  }
}

async function main() {
  let cliArgs
  try {
    cliArgs = parsePublishVenueGalleryArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : 'Invalid arguments'}`)
    printUsage()
    process.exit(1)
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const venue = await resolveVenue({
      supabase,
      venueName: cliArgs.venueName,
    })

    const plan = await buildVenueGalleryPlan({
      venue,
      sourceDir: cliArgs.sourceDir,
      supabaseUrl,
    })

    console.log(`\nVenue: ${plan.venueName}`)
    console.log(`Venue ID: ${plan.venueId}`)
    console.log(`Storage slug: ${plan.venueSlug}`)
    console.log(`Route slug: ${plan.routeSlug}`)
    console.log(`Source folder: ${plan.sourceDir}`)
    console.log(`Review URL: ${plan.reviewUrl}\n`)

    console.log('Publish plan:')
    for (const entry of plan.entries) {
      console.log(`- ${entry.slot} -> ${entry.sourceFilename}`)
      console.log(`  upload: ${entry.objectPath}`)
      console.log(`  url: ${entry.publicUrl}`)
      console.log(`  size: ${entry.sizeBytes} bytes`)
      if (entry.widthPx && entry.heightPx) {
        console.log(`  dimensions: ${entry.widthPx}x${entry.heightPx}`)
      }
      entry.warnings.forEach((warning) => {
        console.log(`  warning: ${warning}`)
      })
    }

    if (!cliArgs.apply) {
      console.log('\nPreview only. Re-run with --apply to upload and replace venue_media.')
      return
    }

    const result = await runVenueGalleryPublish({
      apply: true,
      openBrowser: cliArgs.openBrowser,
      plan,
      supabase: supabase as never,
    })

    if (result.mode !== 'applied') {
      return
    }

    console.log('\n✅ Gallery published successfully.')
    console.log(`Uploaded objects: ${result.uploadedPaths.length}`)
    console.log(`Verified storage files: ${result.verification.storageObjects.join(', ')}`)
    console.log(`Verified venue_media rows: ${result.verification.rows.length}`)
    console.log(`Review URL: ${plan.reviewUrl}`)
    console.log(`Browser opened: ${result.browserOpened ? 'yes' : 'no'}`)
  } catch (error) {
    console.error(`\n❌ ${error instanceof Error ? error.message : 'Publish failed'}`)
    process.exit(1)
  }
}

main()
