import { getTicketState } from '../ticket-utils'
import type { Booking } from '@/types'

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  venue_id: 'venue-1',
  renter_id: 'user-1',
  date: '2099-01-02',
  start_time: '18:00:00',
  end_time: '20:00:00',
  status: 'pending',
  total_amount: 120,
  insurance_approved: true,
  insurance_required: false,
  recurring_type: 'none',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const requestVenue = { instant_booking: false, booking_mode: 'request_to_book' as const, insurance_required: false }
const instantVenue = { instant_booking: true, booking_mode: 'instant_slots' as const, insurance_required: false }

describe('getTicketState for request-to-book venues', () => {
  it('tells the renter a pending request is waiting on an email reply, with no payment', () => {
    const state = getTicketState(booking(), requestVenue)

    expect(state.statusLabel).toBe('Request sent')
    expect(state.statusDescription).toBe("We'll email you within 24 hours once the venue confirms")
    expect(state.canPay).toBe(false)
  })

  it('explains a cancelled request may have been declined', () => {
    const state = getTicketState(booking({ status: 'cancelled' }), requestVenue)

    expect(state.statusLabel).toBe('Cancelled')
    expect(state.statusDescription).toBe('Declined by the venue or cancelled. Check your email for details.')
  })

  it('keeps the existing wording for cancelled bookings at other venues', () => {
    const state = getTicketState(booking({ status: 'cancelled' }), instantVenue)

    expect(state.statusDescription).toBe('This booking was cancelled')
  })

  it('labels a settled request amount as an estimate, since nothing is paid in the app', () => {
    expect(getTicketState(booking({ status: 'confirmed' }), requestVenue).amountSuffix).toBe('estimate')
    expect(getTicketState(booking({ status: 'cancelled' }), requestVenue).amountSuffix).toBe('estimate')
  })

  it('keeps the paid label for venues that take payment', () => {
    expect(getTicketState(booking({ status: 'confirmed' }), instantVenue).amountSuffix).toBe('paid')
  })
})
