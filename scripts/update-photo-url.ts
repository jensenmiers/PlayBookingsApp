#!/usr/bin/env tsx
/**
 * Update Venue Photo URL - Direct URL Update
 * 
 * Updates a venue's photo with a specific URL
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

async function main() {
  const venueName = 'Terasaki Budokan'
  const photoUrl = 'https://phwwfimrpbdwiwpkuzwj.supabase.co/storage/v1/object/public/venue-photos/terasaki-budokan/hero.webp'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: venue, error: fetchError } = await supabase
    .from('venues')
    .select('id, name, photos')
    .eq('name', venueName)
    .single()

  if (fetchError || !venue) {
    console.error(`❌ Venue not found: ${venueName}`)
    process.exit(1)
  }

  const { error: updateError } = await supabase
    .from('venues')
    .update({ 
      photos: [photoUrl],
      updated_at: new Date().toISOString()
    })
    .eq('id', venue.id)

  if (updateError) {
    console.error(`❌ Failed to update: ${updateError.message}`)
    process.exit(1)
  }

  console.log(`✅ Updated ${venueName}`)
  console.log(`   New photo URL: ${photoUrl}`)
}

main()
