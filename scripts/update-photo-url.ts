#!/usr/bin/env tsx
/**
 * Update All Venue Photos to WebP
 * 
 * Updates all venue photo URLs to use standardized .webp format
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { replaceVenueImages } from '../src/lib/venueMediaWrite'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const STORAGE_BUCKET = 'venue-photos'

// Mapping of venue names to their folder slugs in storage
const VENUE_SLUGS: Record<string, string> = {
  'Immaculate Heart': 'immaculate-heart',
  'Boys & Girls Club of Hollywood': 'boys-girls-club-hollywood',
  'Crosscourt': 'crosscourt',
  'Memorial Park': 'memorial-park',
  'Crossroads School': 'crossroads-school',
  'JEM Community Center': 'jem-community-center',
  'First Presbyterian Church of Hollywood': 'first-presbyterian-hollywood',
  'Terasaki Budokan': 'terasaki-budokan',
}

function getPhotoUrl(slug: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${slug}/hero.webp`
}

async function main() {
  console.log('🖼️  Updating all venue photos to .webp format\n')

  if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Fetch all venues
  const { data: venues, error: fetchError } = await supabase
    .from('venues')
    .select('id, name, photos')

  if (fetchError || !venues) {
    console.error('❌ Failed to fetch venues:', fetchError?.message)
    process.exit(1)
  }

  console.log(`Found ${venues.length} venues\n`)

  let updated = 0
  let skipped = 0

  for (const venue of venues) {
    const slug = VENUE_SLUGS[venue.name]
    
    if (!slug) {
      console.log(`⚠️  ${venue.name}: No slug mapping found, skipping`)
      skipped++
      continue
    }

    const photoUrl = getPhotoUrl(slug)
    
    try {
      await replaceVenueImages(supabase, { venueId: venue.id, photoUrls: [photoUrl] })
      console.log(`✅ ${venue.name}`)
      console.log(`   ${photoUrl}`)
      updated++
    } catch (error) {
      console.log(`❌ ${venue.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped`)
}

main()
