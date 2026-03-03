import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faBolt, faClock } from '@fortawesome/free-solid-svg-icons'

export type BookingModeLabelVariant = 'compact' | 'full'

const INSTANT_LABELS: Record<BookingModeLabelVariant, string> = {
  compact: 'Instant',
  full: 'Book Instantly',
}

const APPROVAL_LABELS: Record<BookingModeLabelVariant, string> = {
  compact: 'Host Approval',
  full: 'Host Approval',
}

export function getBookingModeDisplay(
  instantBooking: boolean,
  variant: BookingModeLabelVariant = 'compact'
): {
  mode: 'instant' | 'approval'
  label: string
  icon: IconDefinition
} {
  if (instantBooking) {
    return {
      mode: 'instant',
      label: INSTANT_LABELS[variant],
      icon: faBolt,
    }
  }

  return {
    mode: 'approval',
    label: APPROVAL_LABELS[variant],
    icon: faClock,
  }
}

export const BOOKING_APPROVAL_COPY = {
  discoveryLabel: 'Host Approval',
  pendingStatusLabel: 'Host Approval Pending',
  deferredDetailsMessage: 'Your card will be authorized now and charged after host approval.',
  deferredPaymentDescription: 'Authorize your card to submit your booking request.',
  deferredSetupSubtext: 'Your card will be charged after host approval.',
  deferredSuccessDescription: (venueName: string) =>
    `Your booking at ${venueName} is Host Approval Pending. Your card will be charged once approved.`,
  confirmationDialogTitle: 'Host Approval',
  confirmationDialogBody: 'This booking requires host approval. You will be notified once it is confirmed.',
} as const
