import { createClient } from '@/lib/supabase/server'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Venue } from '@/types'
import {
  isMissingVenueMediaQueryError,
  normalizeVenueCollectionWithMedia,
  type VenueWithOptionalMediaFields,
  VENUE_SELECT_WITH_MEDIA,
} from '@/lib/venueMedia'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type PageProps = { params: Promise<{ name: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name: slug } = await params
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('name, description')
    .eq('is_active', true)

  const venue = venues?.find((v) => slugify(v.name) === slug)

  return {
    title: venue ? `${venue.name} | PlayBookings` : 'Venue Not Found',
    description: venue?.description || 'Book venues on PlayBookings',
  }
}

export default async function VenuePage({ params }: PageProps) {
  const { name: slug } = await params
  const supabase = await createClient()

  let { data: venues, error } = await supabase
    .from('venues')
    .select(VENUE_SELECT_WITH_MEDIA)
    .eq('is_active', true)

  if (error && isMissingVenueMediaQueryError(error)) {
    ;({ data: venues, error } = await supabase
      .from('venues')
      .select('*')
      .eq('is_active', true))
  }

  const venueRows = venues as unknown as Array<VenueWithOptionalMediaFields & {
    id: string
    name: string
  }> | null
  const venue = normalizeVenueCollectionWithMedia(venueRows).find((v) => slugify(v.name) === slug)

  if (!venue) {
    notFound()
  }

  return <VenueDesignEditorial venue={venue as Venue} />
}
