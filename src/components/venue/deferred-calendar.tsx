'use client'

import dynamic from 'next/dynamic'

export const DeferredCalendar = dynamic(
  () => import('@/components/ui/calendar').then((module) => module.Calendar),
  { ssr: false }
)
