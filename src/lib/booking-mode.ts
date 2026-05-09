import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faBolt, faClock, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import type { BookingMode } from '@/types'

export type BookingModeLabelVariant = 'compact' | 'full'
export type BookingModeDisplayMode = 'instant' | 'approval' | 'request'

const INSTANT_LABELS: Record<BookingModeLabelVariant, string> = {
  compact: 'Instant',
  full: 'Book Instantly',
}

const APPROVAL_LABELS: Record<BookingModeLabelVariant, string> = {
  compact: 'Host Approval',
  full: 'Host Approval',
}

const REQUEST_TO_BOOK_LABELS: Record<BookingModeLabelVariant, string> = {
  compact: 'Request to book',
  full: 'Request to book',
}

export function isBookingMode(value: unknown): value is BookingMode {
  return value === 'instant_slots'
    || value === 'approval_slots'
    || value === 'request_to_book'
}

export function resolveVenueBookingMode(
  venueOrMode: boolean | BookingMode | { booking_mode?: unknown; instant_booking?: boolean | null }
): BookingMode {
  if (typeof venueOrMode === 'boolean') {
    return venueOrMode ? 'instant_slots' : 'approval_slots'
  }

  if (isBookingMode(venueOrMode)) {
    return venueOrMode
  }

  if (isBookingMode(venueOrMode.booking_mode)) {
    return venueOrMode.booking_mode
  }

  return venueOrMode.instant_booking ? 'instant_slots' : 'approval_slots'
}

export function getBookingModeDisplay(
  venueOrMode: boolean | BookingMode | { booking_mode?: unknown; instant_booking?: boolean | null },
  variant: BookingModeLabelVariant = 'compact'
): {
  mode: BookingModeDisplayMode
  label: string
  icon: IconDefinition
} {
  const bookingMode = resolveVenueBookingMode(venueOrMode)

  if (bookingMode === 'instant_slots') {
    return {
      mode: 'instant',
      label: INSTANT_LABELS[variant],
      icon: faBolt,
    }
  }

  if (bookingMode === 'request_to_book') {
    return {
      mode: 'request',
      label: REQUEST_TO_BOOK_LABELS[variant],
      icon: faPaperPlane,
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
