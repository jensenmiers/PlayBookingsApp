/* Email clients require a plain img element rather than Next.js Image markup. */
/* eslint-disable @next/next/no-img-element */
import type { ReactElement } from 'react'

export interface BookingConfirmationEmailProps {
  bookingId: string
  renterFirstName: string | null
  venueName: string
  venueAddress: string
  date: string
  startTime: string
  endTime: string
  totalAmount: number
  bookingUrl: string
  replyTo: string
  /** False for request-to-book venues, where payment is arranged with the venue. Defaults to true. */
  paidOnline?: boolean
}

export const PAY_VENUE_DIRECTLY_NOTE = 'No payment was taken here. The venue will arrange payment with you directly.'

function amountLabel(paidOnline: boolean | undefined): string {
  return paidOnline === false ? 'Estimated total' : 'Total paid'
}

export interface BuiltBookingConfirmationEmail {
  subject: string
  react: ReactElement
  text: string
}

const BRAND_RED = '#e11d48'
const BRAND_LOGO_URL = 'https://www.playbookings.com/email/play-bookings-avatar.png'
const INK = '#18181b'
const MUTED = '#71717a'
const PANEL = '#f4f4f5'

/** "Saturday, November 28, 2026", used in every booking email. */
export function formatBookingDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error(`Invalid booking date: ${date}`)
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function formatClockTime(time: string): string {
  const [hourValue, minuteValue] = time.split(':').map(Number)

  if (
    !Number.isInteger(hourValue)
    || !Number.isInteger(minuteValue)
    || hourValue < 0
    || hourValue > 23
    || minuteValue < 0
    || minuteValue > 59
  ) {
    throw new Error(`Invalid booking time: ${time}`)
  }

  const suffix = hourValue >= 12 ? 'PM' : 'AM'
  const hour = hourValue % 12 || 12
  return `${hour}:${String(minuteValue).padStart(2, '0')} ${suffix}`
}

export function formatBookingTimeRange(startTime: string, endTime: string): string {
  return `${formatClockTime(startTime)}–${formatClockTime(endTime)} PT`
}

export function formatBookingAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function BookingConfirmationEmail(props: BookingConfirmationEmailProps) {
  const formattedDate = formatBookingDate(props.date)
  const formattedTime = formatBookingTimeRange(props.startTime, props.endTime)
  const formattedAmount = formatBookingAmount(props.totalAmount)

  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: PANEL, color: INK, fontFamily: 'Arial, sans-serif' }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: PANEL }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ maxWidth: 600, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden' }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: '28px 32px 12px' }}>
                        <table role="presentation" cellPadding="0" cellSpacing="0">
                          <tbody>
                            <tr>
                              <td style={{ paddingRight: 12 }}>
                                <img
                                  src={BRAND_LOGO_URL}
                                  width="44"
                                  height="44"
                                  alt="Play Bookings"
                                  style={{
                                    display: 'block',
                                    border: 0,
                                    borderRadius: 10,
                                    outline: 'none',
                                  }}
                                />
                              </td>
                              <td style={{ fontSize: 22, fontWeight: 700 }}>
                                Play Bookings
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 32px 32px' }}>
                        <div style={{ color: BRAND_RED, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Booking confirmed
                        </div>
                        <h1 style={{ margin: '10px 0 16px', fontSize: 30, lineHeight: 1.2 }}>
                          You&apos;re all set.
                        </h1>
                        <p style={{ margin: '0 0 24px', fontSize: 16, lineHeight: 1.6 }}>
                          Hi {props.renterFirstName?.trim() || 'there'}, your booking at {props.venueName} is confirmed.
                        </p>

                        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: PANEL, borderRadius: 12 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '20px 20px 8px', fontSize: 18, fontWeight: 700 }}>
                                {props.venueName}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0 20px 8px', color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
                                {props.venueAddress}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px 20px 4px', fontSize: 15 }}>
                                <strong>Date:</strong> {formattedDate}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 20px', fontSize: 15 }}>
                                <strong>Time:</strong> {formattedTime}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 20px', fontSize: 15 }}>
                                <strong>{amountLabel(props.paidOnline)}:</strong> {formattedAmount}
                              </td>
                            </tr>
                            {props.paidOnline === false ? (
                              <tr>
                                <td style={{ padding: '4px 20px', color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
                                  {PAY_VENUE_DIRECTLY_NOTE}
                                </td>
                              </tr>
                            ) : null}
                            <tr>
                              <td style={{ padding: '4px 20px 20px', color: MUTED, fontSize: 13 }}>
                                Booking #{props.bookingId}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ marginTop: 28 }}>
                          <a
                            href={props.bookingUrl}
                            style={{
                              display: 'inline-block',
                              padding: '13px 22px',
                              borderRadius: 999,
                              backgroundColor: BRAND_RED,
                              color: '#ffffff',
                              fontSize: 15,
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            View booking
                          </a>
                        </div>

                        <p style={{ margin: '28px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
                          Questions? Reply to this email or contact {props.replyTo}.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

export function buildBookingConfirmationEmail(
  props: BookingConfirmationEmailProps
): BuiltBookingConfirmationEmail {
  const formattedDate = formatBookingDate(props.date)
  const formattedTime = formatBookingTimeRange(props.startTime, props.endTime)
  const formattedAmount = formatBookingAmount(props.totalAmount)
  const subject = `Booking confirmed: ${props.venueName} — ${formattedDate}`
  const react = <BookingConfirmationEmail {...props} />
  const text = [
    `Hi ${props.renterFirstName?.trim() || 'there'},`,
    '',
    `Your booking at ${props.venueName} is confirmed.`,
    '',
    props.venueName,
    props.venueAddress,
    `Date: ${formattedDate}`,
    `Time: ${formattedTime}`,
    `${amountLabel(props.paidOnline)}: ${formattedAmount}`,
    ...(props.paidOnline === false ? [PAY_VENUE_DIRECTLY_NOTE] : []),
    `Booking #${props.bookingId}`,
    '',
    `View booking: ${props.bookingUrl}`,
    '',
    `Questions? Reply to this email or contact ${props.replyTo}.`,
  ].join('\n')

  return { subject, react, text }
}
