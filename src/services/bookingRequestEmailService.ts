import type { CreateEmailOptions } from 'resend'
import {
  formatBookingAmount,
  formatBookingDate,
  formatBookingTimeRange,
} from '@/emails/booking-confirmation-email'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  BookingConfirmationEmailDataError,
  BookingConfirmationEmailDeliveryError,
  LazyResendEmailClient,
  readBookingEmailConfig,
  type BookingEmailConfig,
  type ResendEmailClient,
} from './bookingConfirmationEmailService'

/**
 * Emails for request-to-book venues, where a renter asks for a time and an
 * admin confirms it offline. Confirmation itself reuses
 * BookingConfirmationEmailService; this service covers the request notice,
 * the renter's receipt, and the decline.
 *
 * Admin recipients are the existing booking BCC list (BOOKING_EMAIL_BCC).
 */

export interface BookingRequestEmailRecord {
  bookingId: string
  renterEmail: string
  renterName: string | null
  renterPhone: string | null
  venueName: string
  date: string
  startTime: string
  endTime: string
  totalAmount: number
  activity: string | null
  notes: string | null
}

export interface BookingRequestEmailStore {
  getByBookingId(bookingId: string): Promise<BookingRequestEmailRecord | null>
}

interface BookingRequestEmailServiceDependencies {
  store?: BookingRequestEmailStore
  resend?: ResendEmailClient
  config?: BookingEmailConfig
}

export class SupabaseBookingRequestEmailStore implements BookingRequestEmailStore {
  async getByBookingId(bookingId: string): Promise<BookingRequestEmailRecord | null> {
    const supabase = createAdminClient()
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, renter_id, venue_id, date, start_time, end_time, total_amount, activity, notes')
      .eq('id', bookingId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load booking request: ${error.message}`)
    }
    if (!booking) {
      return null
    }

    const [renterResult, venueResult] = await Promise.all([
      supabase
        .from('users')
        .select('email, first_name, last_name, phone')
        .eq('id', booking.renter_id)
        .maybeSingle(),
      supabase
        .from('venues')
        .select('name')
        .eq('id', booking.venue_id)
        .maybeSingle(),
    ])

    if (renterResult.error) {
      throw new Error(`Failed to load booking request renter: ${renterResult.error.message}`)
    }
    if (venueResult.error) {
      throw new Error(`Failed to load booking request venue: ${venueResult.error.message}`)
    }
    if (!renterResult.data?.email || !venueResult.data) {
      return null
    }

    const renterName = [renterResult.data.first_name, renterResult.data.last_name]
      .filter(Boolean)
      .join(' ')

    return {
      bookingId: booking.id,
      renterEmail: renterResult.data.email,
      renterName: renterName || null,
      renterPhone: renterResult.data.phone ?? null,
      venueName: venueResult.data.name,
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalAmount: Number(booking.total_amount),
      activity: booking.activity ?? null,
      notes: booking.notes ?? null,
    }
  }
}

function summaryLines(record: BookingRequestEmailRecord): string[] {
  return [
    `Venue: ${record.venueName}`,
    `Date: ${formatBookingDate(record.date)}`,
    `Time: ${formatBookingTimeRange(record.startTime, record.endTime)}`,
    `Planning: ${record.activity || 'Not given'}`,
    `Estimated total: ${formatBookingAmount(record.totalAmount)} (no payment taken)`,
  ]
}

export class BookingRequestEmailService {
  private readonly store: BookingRequestEmailStore
  private readonly resend: ResendEmailClient
  private readonly config: BookingEmailConfig

  constructor(dependencies: BookingRequestEmailServiceDependencies = {}) {
    this.store = dependencies.store || new SupabaseBookingRequestEmailStore()
    this.config = dependencies.config || readBookingEmailConfig()
    this.resend = dependencies.resend || new LazyResendEmailClient(this.config.apiKey)
  }

  /** Sends the new-request notice to the admins and a receipt to the renter. */
  async sendRequestReceived(bookingId: string): Promise<void> {
    const record = await this.load(bookingId)
    const date = formatBookingDate(record.date)
    const time = formatBookingTimeRange(record.startTime, record.endTime)
    const failures: string[] = []

    if (this.config.bcc.length > 0 || this.config.overrideTo) {
      const adminText = [
        'A renter has requested a time. Confirm with the venue, then Confirm or Decline in Super Admin.',
        '',
        ...summaryLines(record),
        '',
        `Name: ${record.renterName || 'Not given'}`,
        `Email: ${record.renterEmail}`,
        `Phone: ${record.renterPhone || 'Not given'}`,
        `Message: ${record.notes || 'None'}`,
        '',
        `Super Admin: ${this.config.appUrl}/super-admin`,
      ].join('\n')

      const error = await this.send(
        {
          to: this.config.overrideTo ? [this.config.overrideTo] : this.config.bcc,
          replyTo: this.config.replyTo,
          subject: `New request: ${date} ${time} · ${record.activity || 'Court time'}`,
          text: adminText,
        },
        `booking-request-admin/${record.bookingId}`
      )
      if (error) failures.push(`admin notice: ${error}`)
    }

    const receiptText = [
      `Hi${record.renterName ? ` ${record.renterName}` : ''},`,
      '',
      "We got your request. You're not booked yet.",
      "We'll check with the venue and email you within 24 hours.",
      '',
      ...summaryLines(record),
      '',
      `See your requests: ${this.config.appUrl}/my-bookings`,
    ].join('\n')

    const receiptError = await this.send(
      {
        to: [this.config.overrideTo || record.renterEmail],
        replyTo: this.config.replyTo,
        subject: this.testSubject(`Request received: ${record.venueName}, ${date}`, record),
        text: receiptText,
      },
      `booking-request-receipt/${record.bookingId}`
    )
    if (receiptError) failures.push(`renter receipt: ${receiptError}`)

    if (failures.length > 0) {
      throw new BookingConfirmationEmailDeliveryError(
        `Failed to send booking request emails: ${failures.join('; ')}`
      )
    }
  }

  /** Tells the renter their requested time isn't available. Admins are BCC'd. */
  async sendDeclined(bookingId: string, reason?: string | null): Promise<void> {
    const record = await this.load(bookingId)
    const date = formatBookingDate(record.date)
    const text = [
      `Hi${record.renterName ? ` ${record.renterName}` : ''},`,
      '',
      `Sorry, the time you asked for at ${record.venueName} isn't available.`,
      ...(reason?.trim() ? ['', `Note from the venue: ${reason.trim()}`] : []),
      '',
      ...summaryLines(record),
      '',
      `Request another time: ${this.config.appUrl}`,
    ].join('\n')

    const error = await this.send(
      {
        to: [this.config.overrideTo || record.renterEmail],
        replyTo: this.config.replyTo,
        subject: this.testSubject(`Not available: ${record.venueName}, ${date}`, record),
        text,
        ...(this.config.overrideTo || this.config.bcc.length === 0 ? {} : { bcc: this.config.bcc }),
      },
      `booking-request-declined/${record.bookingId}`
    )

    if (error) {
      throw new BookingConfirmationEmailDeliveryError(`Failed to send decline email: ${error}`)
    }
  }

  private async load(bookingId: string): Promise<BookingRequestEmailRecord> {
    if (!this.config.apiKey) {
      throw new BookingConfirmationEmailDeliveryError('RESEND_API_KEY is not configured')
    }

    const record = await this.store.getByBookingId(bookingId)
    if (!record) {
      throw new BookingConfirmationEmailDataError(`Booking request data not found for ${bookingId}`)
    }
    return record
  }

  private testSubject(subject: string, record: BookingRequestEmailRecord): string {
    return this.config.overrideTo ? `[TEST for ${record.renterEmail}] ${subject}` : subject
  }

  private async send(
    message: Pick<CreateEmailOptions, 'to' | 'replyTo' | 'subject' | 'bcc'> & { text: string },
    idempotencyKey: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.resend.emails.send(
        { from: this.config.from, ...message } as CreateEmailOptions,
        { idempotencyKey }
      )
      if (error || !data?.id) {
        return error?.message || 'Resend returned no email ID'
      }
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }
}
