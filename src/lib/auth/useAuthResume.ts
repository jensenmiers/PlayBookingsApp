'use client'

import { useEffect } from 'react'
import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'
import {
  clearAuthResumeState,
  consumeAuthResumeStateForReturnTo,
  getCurrentRelativeUrl,
  peekAuthResumeStateForReturnTo,
  type CreateBookingFormResumeState,
  type SlotBookingResumeState,
} from '@/lib/auth/authResume'

export function useCreateBookingFormAuthResume(args: {
  canResume: (resumeState: CreateBookingFormResumeState) => boolean
  onResume: (resumeState: CreateBookingFormResumeState) => void
}) {
  useEffect(() => {
    const currentReturnTo = getCurrentRelativeUrl()
    const resumeState = peekAuthResumeStateForReturnTo(currentReturnTo)
    if (!resumeState || resumeState.type !== 'create-booking-form' || !args.canResume(resumeState)) {
      return
    }

    const consumedState = consumeAuthResumeStateForReturnTo(currentReturnTo)
    if (consumedState?.type === 'create-booking-form') {
      args.onResume(consumedState)
    }
  }, [args])
}

function findMatchingSlot(
  resumeState: SlotBookingResumeState,
  slots: ComputedAvailabilitySlot[]
): ComputedAvailabilitySlot | undefined {
  if (resumeState.slotInstanceId) {
    const matchedByInstanceId = slots.find((slot) => slot.slot_instance_id === resumeState.slotInstanceId)
    if (matchedByInstanceId) {
      return matchedByInstanceId
    }
  }

  return slots.find((slot) =>
    slot.date === resumeState.date
    && slot.start_time === resumeState.startTime
    && slot.end_time === resumeState.endTime
    && slot.action_type === resumeState.slotActionType
  )
}

export function useSlotBookingAuthResume(args: {
  venueId: string
  slots: ComputedAvailabilitySlot[]
  loading: boolean
  onResume: (slot: ComputedAvailabilitySlot) => void
}) {
  useEffect(() => {
    const currentReturnTo = getCurrentRelativeUrl()
    const resumeState = peekAuthResumeStateForReturnTo(currentReturnTo)
    if (!resumeState || resumeState.type !== 'slot-booking' || resumeState.venueId !== args.venueId) {
      return
    }

    if (args.loading) {
      return
    }

    const matchingSlot = findMatchingSlot(resumeState, args.slots)
    if (!matchingSlot) {
      clearAuthResumeState()
      return
    }

    const consumedState = consumeAuthResumeStateForReturnTo(currentReturnTo)
    if (consumedState?.type === 'slot-booking') {
      args.onResume(matchingSlot)
    }
  }, [args])
}
