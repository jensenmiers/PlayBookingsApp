#!/usr/bin/env tsx
/**
 * Venue Seeding Script
 * 
 * Seeds 8 real LA basketball court venues for PlayBookings MVP.
 * 
 * Run this script to seed venues:
 *   npm run seed:venues
 * 
 * Or directly:
 *   npx tsx scripts/seed-venues.ts
 * 
 * Prerequisites:
 *   - Owner user (jensenmiers@gmail.com) must exist in the database
 *   - Run this before seed-availability.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const STORAGE_BUCKET = 'venue-photos'

interface VenueSeed {
  name: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  latitude: number
  longitude: number
  hourly_rate: number
  weekend_rate: number
  instant_booking: boolean
  insurance_required: boolean
  max_advance_booking_days: number
  photos: string[]
  amenities: string[]
  is_active: boolean
  owner_id?: string
}

/**
 * Helper to convert venue name to URL-friendly slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Venue data for 8 real LA basketball courts
const VENUES: VenueSeed[] = [
  {
    name: 'Immaculate Heart',
    description: 'Private school gymnasium in Los Feliz offering indoor basketball courts. Historic campus with modern athletic facilities, ideal for practice sessions and small tournaments.',
    address: '5515 Franklin Ave',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90028',
    latitude: 34.1066,
    longitude: -118.2930,
    hourly_rate: 80,
    weekend_rate: 100,
    instant_booking: false,
    insurance_required: true,
    max_advance_booking_days: 90,
    photos: [], // Will be populated when images are uploaded
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'Boys & Girls Club of Hollywood',
    description: 'Community youth center with full-size indoor basketball court. Serving the Hollywood community with athletic programs and court rentals. Great for team practices and pickup games.',
    address: '850 N Cahuenga Blvd',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90038',
    latitude: 34.0875,
    longitude: -118.3296,
    hourly_rate: 60,
    weekend_rate: 75,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: [],
    amenities: ['Indoor Court', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'Crosscourt',
    description: 'Private basketball facility in a converted industrial warehouse. Professional-grade courts with excellent lighting and modern amenities. Perfect for training, events, and competitive play.',
    address: '333 N Mission Rd, Unit A',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90033',
    latitude: 34.0574,
    longitude: -118.2171,
    hourly_rate: 120,
    weekend_rate: 150,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 60,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'Memorial Park',
    description: 'Santa Monica community recreation center with indoor gym featuring basketball and volleyball courts. City-operated facility with drop-in sports available. Family-friendly environment.',
    address: '1401 Olympic Blvd',
    city: 'Santa Monica',
    state: 'CA',
    zip_code: '90404',
    latitude: 34.0244,
    longitude: -118.4725,
    hourly_rate: 75,
    weekend_rate: 95,
    instant_booking: false,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'Crossroads School',
    description: 'Private K-12 school in Santa Monica with well-maintained gymnasium. Courts available during non-school hours for community use. Modern facilities in a safe campus environment.',
    address: '1714 21st St',
    city: 'Santa Monica',
    state: 'CA',
    zip_code: '90404',
    latitude: 34.0246,
    longitude: -118.4761,
    hourly_rate: 90,
    weekend_rate: 115,
    instant_booking: false,
    insurance_required: true,
    max_advance_booking_days: 60,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'JEM Community Center',
    description: 'Multi-purpose community center in Beverly Hills with basketball courts and additional recreational facilities. Active community programming with excellent amenities.',
    address: '9930 S Santa Monica Blvd',
    city: 'Beverly Hills',
    state: 'CA',
    zip_code: '90212',
    latitude: 34.0597,
    longitude: -118.4114,
    hourly_rate: 85,
    weekend_rate: 105,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 45,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'First Presbyterian Church of Hollywood',
    description: 'Large church campus in Hollywood with gymnasium facilities. Community-focused space available for basketball activities and events. Historic venue with ample parking.',
    address: '1760 N Gower St',
    city: 'Hollywood',
    state: 'CA',
    zip_code: '90028',
    latitude: 34.1028,
    longitude: -118.3204,
    hourly_rate: 70,
    weekend_rate: 85,
    instant_booking: false,
    insurance_required: true,
    max_advance_booking_days: 30,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms'],
    is_active: true,
  },
  {
    name: 'Terasaki Budokan',
    description: 'Modern community recreation center in Little Tokyo with two full-size basketball courts convertible to four volleyball courts. Features underground parking with EV charging stations. Premier facility for sports and community events.',
    address: '249 S Los Angeles St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90012',
    latitude: 34.0474,
    longitude: -118.2399,
    hourly_rate: 100,
    weekend_rate: 125,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 60,
    photos: [],
    amenities: ['Indoor Court', 'Parking', 'Restrooms', 'EV Charging'],
    is_active: true,
  },
]

async function main() {
  console.log('🏀 Venue Seeding Script\n')
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
    console.log('Looking for owner user (jensenmiers@gmail.com)...')
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', 'jensenmiers@gmail.com')
      .single()

    if (ownerError || !owner) {
      console.error('❌ Could not find owner user (jensenmiers@gmail.com)')
      console.error('   Please ensure you have logged in via Google OAuth at least once.')
      if (ownerError) {
        console.error('   Error:', ownerError.message)
      }
      process.exit(1)
    }

    console.log(`✓ Found owner: ${owner.first_name || ''} ${owner.last_name || ''} (${owner.id})\n`)

    const { data: existingVenues, error: existingError } = await supabase
      .from('venues')
      .select('name')

    if (existingError) {
      console.error('❌ Error checking existing venues:', existingError.message)
      process.exit(1)
    }

    const existingNames = new Set(existingVenues?.map(v => v.name) || [])
    const venuesToInsert = VENUES.filter(v => !existingNames.has(v.name))

    if (venuesToInsert.length === 0) {
      console.log('⚠️  All venues already exist in the database. No new venues to insert.')
      console.log('   Existing venues:', existingNames.size)
      process.exit(0)
    }

    if (venuesToInsert.length < VENUES.length) {
      console.log(`⚠️  ${VENUES.length - venuesToInsert.length} venue(s) already exist, skipping:`)
      VENUES.filter(v => existingNames.has(v.name)).forEach(v => {
        console.log(`   - ${v.name}`)
      })
      console.log()
    }

    const venuesWithOwner = venuesToInsert.map(venue => ({
      ...venue,
      owner_id: owner.id,
    }))

    console.log(`Inserting ${venuesWithOwner.length} new venue(s)...`)

    const { data: insertedVenues, error: insertError } = await supabase
      .from('venues')
      .insert(venuesWithOwner)
      .select('id, name')

    if (insertError) {
      console.error('❌ Failed to insert venues:', insertError.message)
      process.exit(1)
    }

    console.log(`\n✅ Successfully inserted ${insertedVenues?.length} venue(s):`)
    insertedVenues?.forEach((venue, index) => {
      console.log(`   ${index + 1}. ${venue.name}`)
      console.log(`      ID: ${venue.id}`)
      console.log(`      Slug: ${slugify(venue.name)}`)
    })

    console.log('\n📋 Next Steps:')
    console.log('   1. Upload hero images to Supabase Storage:')
    console.log(`      Bucket: ${STORAGE_BUCKET}`)
    console.log('      Path format: {venue-slug}/hero.jpg')
    console.log('\n   Example image paths:')
    insertedVenues?.slice(0, 3).forEach(venue => {
      const slug = slugify(venue.name)
      console.log(`      - ${slug}/hero.jpg`)
    })
    console.log('\n   2. Run availability seeder:')
    console.log('      npx tsx scripts/seed-availability.ts')

  } catch (error) {
    console.error('\n❌ Seeding failed!')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

main()
