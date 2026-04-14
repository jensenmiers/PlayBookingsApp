'use client'

import dynamic from 'next/dynamic'

export const DeferredSlotBookingConfirmation = dynamic(
  () => import('@/components/booking/slot-booking-confirmation').then((module) => module.SlotBookingConfirmation),
  { ssr: false }
)
