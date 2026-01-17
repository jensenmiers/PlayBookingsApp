#!/usr/bin/env tsx
/**
 * Update Venue Photo Script
 * 
 * Updates the photos array for a specific venue.
 * 
 * Usage:
 *   npx tsx scripts/update-venue-photo.ts "JEM Community Center"
 *   npx tsx scripts/update-venue-photo.ts "Crosscourt"
 *   npx tsx scripts/update-venue-photo.ts --all   # Update all venues with standard naming
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const STORAGE_BUCKET = 'venue-photos'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getPhotoUrl(venueSlug: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${venueSlug}/hero.jpg`
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage:')
    console.log('  npx tsx scripts/update-venue-photo.ts "Venue Name"')
    console.log('  npx tsx scripts/update-venue-photo.ts --all')
    process.exit(1)
  }

  if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (args[0] === '--all') {
    // Update all venues
    const { data: venues, error: fetchError } = await supabase
      .from('venues')
      .select('id, name')

    if (fetchError || !venues) {
      console.error('❌ Failed to fetch venues:', fetchError?.message)
      process.exit(1)
    }

    console.log(`Updating photos for ${venues.length} venues...\n`)

    for (const venue of venues) {
      const slug = slugify(venue.name)
      const photoUrl = getPhotoUrl(slug)

      const { error: updateError } = await supabase
        .from('venues')
        .update({ photos: [photoUrl], updated_at: new Date().toISOString() })
        .eq('id', venue.id)

      if (updateError) {
        console.log(`❌ ${venue.name}: ${updateError.message}`)
      } else {
        console.log(`✓ ${venue.name}`)
        console.log(`  URL: ${photoUrl}`)
      }
    }
  } else {
    // Update single venue
    const venueName = args.join(' ')
    const slug = slugify(venueName)
    const photoUrl = getPhotoUrl(slug)

    console.log(`Updating photo for: ${venueName}`)
    console.log(`Slug: ${slug}`)
    console.log(`URL: ${photoUrl}\n`)

    const { data: venue, error: fetchError } = await supabase
      .from('venues')
      .select('id, name, photos')
      .eq('name', venueName)
      .single()

    if (fetchError || !venue) {
      console.error(`❌ Venue not found: ${venueName}`)
      console.error('   Available venues:')
      
      const { data: allVenues } = await supabase.from('venues').select('name')
      allVenues?.forEach(v => console.log(`   - ${v.name}`))
      process.exit(1)
    }

    const { error: updateError } = await supabase
      .from('venues')
      .update({ photos: [photoUrl], updated_at: new Date().toISOString() })
      .eq('id', venue.id)

    if (updateError) {
      console.error(`❌ Failed to update: ${updateError.message}`)
      process.exit(1)
    }

    console.log(`✅ Updated ${venueName}`)
    console.log(`   Old photos: ${JSON.stringify(venue.photos)}`)
    console.log(`   New photos: ["${photoUrl}"]`)
  }
}

main()
