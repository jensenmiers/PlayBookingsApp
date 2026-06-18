'use client'

import { useMemo } from 'react'
import { useVenues } from '@/hooks/useVenues'
import { useVenuesWithNextAvailable } from '@/hooks/useVenuesWithNextAvailable'
import { buildHomeInitialDataState } from '@/app/home-initial-data-state'

export function useHomeInitialData() {
  const { data: venues, loading: venuesLoading, error: venuesError } = useVenues()
  const {
    data: availabilityVenues,
    loading: availabilityLoading,
    error: availabilityError,
  } = useVenuesWithNextAvailable()

  return useMemo(
    () =>
      buildHomeInitialDataState({
        venues,
        availabilityVenues,
        venuesLoading,
        availabilityLoading,
        venuesError,
        availabilityError,
      }),
    [venues, availabilityVenues, venuesLoading, availabilityLoading, venuesError, availabilityError]
  )
}
