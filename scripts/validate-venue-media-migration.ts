#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

type VenueRow = {
  id: string
  name: string
  photos: unknown
}

type VenueMediaRow = {
  venue_id: string
  public_url: string
  sort_order: number
  is_primary: boolean
}

function normalizeLegacyPhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) {
    return photos.filter((photo): photo is string => typeof photo === 'string')
  }

  return []
}

async function main() {
  const [{ data: venues, error: venuesError }, { data: mediaRows, error: mediaError }] = await Promise.all([
    supabase.from('venues').select('id, name, photos').order('name', { ascending: true }),
    supabase
      .from('venue_media')
      .select('venue_id, public_url, sort_order, is_primary')
      .order('venue_id', { ascending: true })
      .order('sort_order', { ascending: true }),
  ])

  if (venuesError) {
    throw new Error(`Failed to fetch venues: ${venuesError.message}`)
  }

  if (mediaError) {
    throw new Error(`Failed to fetch venue_media: ${mediaError.message}`)
  }

  const mediaByVenueId = new Map<string, VenueMediaRow[]>()
  for (const row of (mediaRows || []) as VenueMediaRow[]) {
    const existing = mediaByVenueId.get(row.venue_id) || []
    existing.push(row)
    mediaByVenueId.set(row.venue_id, existing)
  }

  const mismatches: string[] = []
  let duplicateSortOrders = 0
  let invalidPrimaryCounts = 0

  for (const venue of (venues || []) as VenueRow[]) {
    const legacyPhotos = normalizeLegacyPhotos(venue.photos)
    const media = (mediaByVenueId.get(venue.id) || []).sort((left, right) => left.sort_order - right.sort_order)

    if (legacyPhotos.length !== media.length) {
      mismatches.push(`${venue.name}: legacy=${legacyPhotos.length} media=${media.length}`)
      continue
    }

    if (legacyPhotos.length > 0 && legacyPhotos[0] !== media[0]?.public_url) {
      mismatches.push(`${venue.name}: primary mismatch`)
    }

    const sortOrderSet = new Set(media.map((row) => row.sort_order))
    if (sortOrderSet.size !== media.length) {
      duplicateSortOrders += 1
    }

    const primaryCount = media.filter((row) => row.is_primary).length
    if (media.length > 0 && primaryCount !== 1) {
      invalidPrimaryCounts += 1
    }
  }

  console.log(`Checked ${(venues || []).length} venues`)
  console.log(`Mismatched venues: ${mismatches.length}`)
  console.log(`Venues with duplicate sort orders: ${duplicateSortOrders}`)
  console.log(`Venues with invalid primary counts: ${invalidPrimaryCounts}`)

  if (mismatches.length > 0) {
    console.log('\nMismatches:')
    mismatches.forEach((line) => console.log(`- ${line}`))
  }

  if (mismatches.length > 0 || duplicateSortOrders > 0 || invalidPrimaryCounts > 0) {
    process.exitCode = 1
  } else {
    console.log('\nVenue media migration validation passed.')
  }
}

void main()
