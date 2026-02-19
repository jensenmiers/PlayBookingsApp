import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { VenueDesignScoreboard } from '@/components/venue/venue-design-scoreboard'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'
import { VenueDesignQuickplay } from '@/components/venue/venue-design-quickplay'
import { VenueDesignArena } from '@/components/venue/venue-design-arena'
import { VenueDesignCommunity } from '@/components/venue/venue-design-community'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

type PageProps = { params: Promise<{ name: string; variant: string }> }

const VALID_VARIANTS = ['1', '2', '3', '4', '5'] as const
type ValidVariant = (typeof VALID_VARIANTS)[number]

const DESIGN_COMPONENTS: Record<ValidVariant, React.ComponentType<{ venue: any }>> = {
  '1': VenueDesignScoreboard,
  '2': VenueDesignEditorial,
  '3': VenueDesignQuickplay,
  '4': VenueDesignArena,
  '5': VenueDesignCommunity,
}

const DESIGN_NAMES: Record<ValidVariant, string> = {
  '1': 'Scoreboard',
  '2': 'Editorial',
  '3': 'Quick Play',
  '4': 'Arena',
  '5': 'Community',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name: slug, variant } = await params
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('name, description')
    .eq('is_active', true)

  const venue = venues?.find((v) => slugify(v.name) === slug)
  const designName = DESIGN_NAMES[variant as ValidVariant] || 'Design'

  return {
    title: venue ? `${venue.name} - ${designName} | PlayBookings` : 'Venue Not Found',
    description: venue?.description || 'Book venues on PlayBookings',
  }
}

export default async function VenueVariantPage({ params }: PageProps) {
  const { name: slug, variant } = await params

  if (!VALID_VARIANTS.includes(variant as ValidVariant)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)

  const venue = venues?.find((v) => slugify(v.name) === slug)

  if (!venue) {
    notFound()
  }

  const DesignComponent = DESIGN_COMPONENTS[variant as ValidVariant]
  return <DesignComponent venue={venue} />
}
