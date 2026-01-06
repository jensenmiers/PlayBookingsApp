'use client'

import { Navigation } from '@/components/layout/navigation'
import { CalendarView } from '@/components/search/calendar-view'

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />
      <CalendarView />
    </div>
  )
}

