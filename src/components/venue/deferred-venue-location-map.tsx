'use client'

import dynamic from 'next/dynamic'

export const DeferredVenueLocationMap = dynamic(
  () => import('@/components/maps/venue-location-map').then((module) => module.VenueLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 sm:h-64 md:h-72 rounded-xl border border-secondary-50/10 bg-secondary-50/5 animate-pulse" />
    ),
  }
)
