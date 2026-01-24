'use client'

import { Navigation } from '@/components/layout/navigation'
import { SplitAvailabilityView } from '@/components/search/split-availability-view'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <SplitAvailabilityView />
    </div>
  )
}

