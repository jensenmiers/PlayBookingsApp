import { isPastBookingStart } from '@/utils/dateHelpers'
import type { Booking, Venue } from '@/types'

export interface TicketState {
  canPay: boolean
  canCancel: boolean
  isPast: boolean
  insuranceGated: boolean
  primaryAction: 'pay' | 'directions' | 'book-again' | 'waiting' | null
  showAmount: 'prominent' | 'subdued'
  statusLabel: string
  statusDescription: string
  statusVariant: 'pending' | 'pending-insurance' | 'confirmed' | 'cancelled' | 'completed'
}

export function getTicketState(booking: Booking, venue: Venue | null): TicketState {
  const isPast = isPastBookingStart(booking.date, booking.start_time)
  const insuranceGated = booking.insurance_required && !booking.insurance_approved && booking.status === 'pending'

  const canPay =
    booking.status === 'pending' &&
    !isPast &&
    (!booking.insurance_required || booking.insurance_approved)

  const canCancel =
    !isPast &&
    (booking.status === 'pending' || booking.status === 'confirmed')

  let primaryAction: TicketState['primaryAction'] = null
  if (canPay) {
    primaryAction = 'pay'
  } else if (booking.status === 'confirmed' && !isPast) {
    primaryAction = 'directions'
  } else if (booking.status === 'completed' || booking.status === 'cancelled') {
    primaryAction = 'book-again'
  } else if (booking.status === 'pending' && !canPay && !insuranceGated && !isPast) {
    primaryAction = 'waiting'
  }

  const showAmount: TicketState['showAmount'] = booking.status === 'pending' ? 'prominent' : 'subdued'

  let statusLabel: string
  let statusDescription: string
  let statusVariant: TicketState['statusVariant']

  switch (booking.status) {
    case 'pending':
      if (insuranceGated) {
        statusLabel = 'Pending'
        statusDescription = 'Insurance verification required before payment'
        statusVariant = 'pending-insurance'
      } else if (canPay) {
        statusLabel = 'Pending'
        statusDescription = 'Awaiting payment'
        statusVariant = 'pending'
      } else if (isPast) {
        statusLabel = 'Expired'
        statusDescription = 'This booking has expired'
        statusVariant = 'cancelled'
      } else {
        statusLabel = 'Pending'
        statusDescription = 'Awaiting owner confirmation'
        statusVariant = 'pending'
      }
      break
    case 'confirmed':
      statusLabel = 'Confirmed'
      statusDescription = isPast ? 'This booking has passed' : "You're all set!"
      statusVariant = 'confirmed'
      break
    case 'cancelled':
      statusLabel = 'Cancelled'
      statusDescription = 'This booking was cancelled'
      statusVariant = 'cancelled'
      break
    case 'completed':
      statusLabel = 'Completed'
      statusDescription = 'This booking has been completed'
      statusVariant = 'completed'
      break
  }

  return {
    canPay,
    canCancel,
    isPast,
    insuranceGated,
    primaryAction,
    showAmount,
    statusLabel,
    statusDescription,
    statusVariant,
  }
}
