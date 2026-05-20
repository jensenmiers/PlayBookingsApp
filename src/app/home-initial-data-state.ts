import type { Venue } from '@/types'
import type { MapVenue } from '@/hooks/useVenuesWithNextAvailable'

export interface HomeInitialDataStateInput {
  venues: Venue[] | null
  availabilityVenues: MapVenue[] | null
  venuesLoading: boolean
  availabilityLoading: boolean
  venuesError: string | null
  availabilityError: string | null
}

export interface HomeInitialDataState {
  venues: Venue[]
  availabilityVenues: MapVenue[]
  loading: boolean
  error: string | null
}

export function buildHomeInitialDataState(input: HomeInitialDataStateInput): HomeInitialDataState {
  return {
    venues: input.venues || [],
    availabilityVenues: input.availabilityVenues || [],
    loading: input.venuesLoading || input.availabilityLoading,
    error: input.venuesError || input.availabilityError,
  }
}
