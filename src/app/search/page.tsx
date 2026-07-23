'use client'

import { Suspense } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { SplitAvailabilityView } from '@/components/search/split-availability-view'

function SearchContent() {
  return (
    <div className="min-h-screen bg-secondary-800">
      <Navigation />
      <SplitAvailabilityView />
      <PublicSiteFooter />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-secondary-800">
          <Navigation />
          <div className="flex h-[calc(100vh-64px)] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-50/60" />
          </div>
          <PublicSiteFooter />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
