import { render as renderEmail } from '@react-email/render'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  buildBookingConfirmationEmail,
  formatBookingAmount,
  formatBookingDate,
  formatBookingTimeRange,
} from '@/emails/booking-confirmation-email'

const booking = {
  bookingId: 'booking-123',
  renterFirstName: 'Jensen',
  venueName: 'Memorial Park Gym',
  venueAddress: '1401 Olympic Blvd, Santa Monica, CA 90404',
  date: '2026-08-05',
  startTime: '18:30:00',
  endTime: '20:00:00',
  totalAmount: 175,
  bookingUrl: 'https://www.playbookings.com/my-bookings/booking-123',
  replyTo: 'jensen@playbookings.com',
}

describe('booking confirmation email', () => {
  it('formats booking values without server-timezone drift', () => {
    expect(formatBookingDate('2026-08-05')).toBe('Wednesday, August 5, 2026')
    expect(formatBookingTimeRange('00:05:00', '13:30:00')).toBe('12:05 AM–1:30 PM PT')
    expect(formatBookingAmount(175)).toBe('$175.00')
  })

  it('loads the renderer required by the Resend React payload', () => {
    expect(renderEmail).toEqual(expect.any(Function))
  })

  it('builds the customer subject, renderable React, and plain-text versions', () => {
    const email = buildBookingConfirmationEmail(booking)
    const html = renderToStaticMarkup(email.react)

    expect(email.subject).toBe('Booking confirmed: Memorial Park Gym — Wednesday, August 5, 2026')
    expect(html).toContain('alt="Play Bookings"')
    expect(html).toContain(
      'src="https://www.playbookings.com/email/play-bookings-avatar.png"'
    )
    expect(html).toContain('Play Bookings')
    expect(html).not.toContain('PlayBookings')
    expect(html).toContain('Hi Jensen,')
    expect(html).toContain('Memorial Park Gym')
    expect(html).toContain('1401 Olympic Blvd, Santa Monica, CA 90404')
    expect(html).toContain('6:30 PM–8:00 PM PT')
    expect(html).toContain('$175.00')
    expect(html).toContain('booking-123')
    expect(html).toContain('https://www.playbookings.com/my-bookings/booking-123')
    expect(email.text).toContain('View booking: https://www.playbookings.com/my-bookings/booking-123')
    expect(email.text).toContain('Questions? Reply to this email or contact jensen@playbookings.com.')
  })

  it('labels the amount as paid for venues that take payment online', () => {
    const email = buildBookingConfirmationEmail(booking)

    expect(email.text).toContain('Total paid: $175.00')
    expect(email.text).not.toContain('No payment was taken here')
  })

  it('labels the amount as an estimate for request-to-book venues', () => {
    const email = buildBookingConfirmationEmail({ ...booking, paidOnline: false })
    const html = renderToStaticMarkup(email.react)

    expect(email.text).toContain('Estimated total: $175.00')
    expect(email.text).not.toContain('Total paid')
    expect(email.text).toContain('No payment was taken here')
    expect(html).toContain('Estimated total')
    expect(html).toContain('No payment was taken here')
  })

  it('uses a neutral greeting when the renter has no first name', () => {
    const email = buildBookingConfirmationEmail({
      ...booking,
      renterFirstName: null,
    })

    expect(renderToStaticMarkup(email.react)).toContain('Hi there,')
  })
})
