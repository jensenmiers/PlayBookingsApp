'use client'

import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { SplitAvailabilityView } from '@/components/search/split-availability-view'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-secondary-800">
      <Navigation />
      <SplitAvailabilityView />
      <PublicSiteFooter />
    </div>
  )
}
