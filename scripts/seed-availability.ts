#!/usr/bin/env tsx
/**
 * Availability Seeding Script
 * 
 * Seeds availability data for venues:
 * - Venue 1: 6:00 AM - 10:00 PM (1-hour blocks)
 * - Venue 2: 6:00 PM - 10:00 PM (1-hour blocks)
 * 
 * Run this script to seed availability:
 *   npm run seed:availability
 * 
 * Or directly:
 *   npx tsx scripts/seed-availability.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

interface AvailabilitySlot {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
}

async function main() {
  console.log('🌱 Availability Seeding Script\n')
  console.log('Environment check:')
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}\n`)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables!')
    console.error('   Please ensure .env.local contains:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Fetch all active venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name, max_advance_booking_days')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (venuesError) {
      throw new Error(`Failed to fetch venues: ${venuesError.message}`)
    }

    if (!venues || venues.length === 0) {
      console.log('⚠️  No active venues found. Please create venues first.')
      process.exit(0)
    }

    console.log(`Found ${venues.length} active venue(s):`)
    venues.forEach((venue, index) => {
      console.log(`  ${index + 1}. ${venue.name} (ID: ${venue.id})`)
    })
    console.log()

    // Determine availability ranges for each venue
    // Venue 1: 6 AM - 10 PM, Venue 2: 6 PM - 10 PM
    const venueConfigs = venues.map((venue, index) => {
      if (index === 0) {
        // First venue: 6 AM - 10 PM
        return {
          venue_id: venue.id,
          venue_name: venue.name,
          start_hour: 6,
          end_hour: 22, // 10 PM (22:00)
          max_advance_days: venue.max_advance_booking_days || 180,
        }
      } else {
        // Second venue: 6 PM - 10 PM
        return {
          venue_id: venue.id,
          venue_name: venue.name,
          start_hour: 18, // 6 PM
          end_hour: 22, // 10 PM
          max_advance_days: venue.max_advance_booking_days || 180,
        }
      }
    })

    // Generate availability slots
    const today = new Date()
    const slotsToInsert: AvailabilitySlot[] = []

    for (const config of venueConfigs) {
      console.log(`Generating availability for ${config.venue_name}...`)
      
      // Generate slots for each day up to max_advance_days
      for (let dayOffset = 0; dayOffset < config.max_advance_days; dayOffset++) {
        const date = new Date(today)
        date.setDate(date.getDate() + dayOffset)
        const dateStr = date.toISOString().split('T')[0]

        // Generate hourly slots
        for (let hour = config.start_hour; hour < config.end_hour; hour++) {
          const startTime = `${hour.toString().padStart(2, '0')}:00:00`
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`

          slotsToInsert.push({
            venue_id: config.venue_id,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
            is_available: true,
          })
        }
      }

      console.log(`  ✓ Generated ${config.max_advance_days} days × ${config.end_hour - config.start_hour} hours = ${config.max_advance_days * (config.end_hour - config.start_hour)} slots`)
    }

    console.log(`\nTotal slots to insert: ${slotsToInsert.length}`)

    // Check for existing availability to avoid duplicates
    if (slotsToInsert.length > 0) {
      const firstSlot = slotsToInsert[0]
      const { count: existingCount } = await supabase
        .from('availability')
        .select('*', { count: 'exact', head: true })
        .eq('venue_id', firstSlot.venue_id)
        .eq('date', firstSlot.date)

      if (existingCount && existingCount > 0) {
        console.log(`\n⚠️  Found ${existingCount} existing availability records for this venue/date.`)
        console.log('   This script will insert new records (database constraints will prevent duplicates).')
        console.log('   To re-seed, delete existing availability records first.\n')
      }
    }

    // Insert in batches to avoid overwhelming the database
    const batchSize = 1000
    let inserted = 0
    let errors = 0

    for (let i = 0; i < slotsToInsert.length; i += batchSize) {
      const batch = slotsToInsert.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('availability')
        .insert(batch)
        .select()

      if (insertError) {
        // Check if it's a duplicate constraint error (which is okay)
        if (insertError.code === '23505') {
          // Unique constraint violation - some slots already exist
          console.log(`  ⚠️  Batch ${Math.floor(i / batchSize) + 1}: Some slots already exist (skipping duplicates)`)
        } else {
          console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} error:`, insertError.message)
          errors++
        }
      } else {
        inserted += batch.length
        console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} slots)`)
      }
    }

    console.log(`\n✅ Seeding complete!`)
    console.log(`   Inserted: ${inserted} slots`)
    if (errors > 0) {
      console.log(`   Errors: ${errors} batches`)
    }
    console.log(`   Total processed: ${slotsToInsert.length} slots`)
  } catch (error) {
    console.error('\n❌ Seeding failed!')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()

