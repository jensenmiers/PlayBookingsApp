import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  CreateEmailResponse,
} from 'resend'
import { buildBookingConfirmationEmail } from '@/emails/booking-confirmation-email'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BookingStatus } from '@/types'

export interface BookingConfirmationEmailRecord {
  bookingId: string
  renterEmail: string
  renterFirstName: string | null
  venueName: string
  venueAddress: string
  venueCity: string
  venueState: string
  venueZipCode: string
  date: string
  startTime: string
  endTime: string
  totalAmount: number
  status: BookingStatus
  confirmationEmailSentAt: string | null
  paidOnline?: boolean
}

export interface BookingConfirmationEmailStore {
  getByBookingId(bookingId: string): Promise<BookingConfirmationEmailRecord | null>
  markSent(bookingId: string, resendEmailId: string, sentAt: string): Promise<void>
}

export interface ResendEmailClient {
  emails: {
    send(
      payload: CreateEmailOptions,
      options?: CreateEmailRequestOptions
    ): Promise<CreateEmailResponse>
  }
}

export interface BookingEmailConfig {
  apiKey: string
  from: string
  replyTo: string
  bcc: string[]
  overrideTo: string | null
  appUrl: string
}

interface BookingConfirmationEmailServiceDependencies {
  store?: BookingConfirmationEmailStore
  resend?: ResendEmailClient
  config?: BookingEmailConfig
}

export class LazyResendEmailClient implements ResendEmailClient {
  readonly emails: ResendEmailClient['emails']

  constructor(apiKey: string) {
    this.emails = {
      send: async (payload, options) => {
        const { Resend } = await import('resend')
        return new Resend(apiKey).emails.send(payload, options)
      },
    }
  }
}

export class BookingConfirmationEmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingConfirmationEmailDeliveryError'
  }
}

export class BookingConfirmationEmailDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingConfirmationEmailDataError'
  }
}

function splitEmailList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

export function readBookingEmailConfig(): BookingEmailConfig {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.BOOKING_EMAIL_FROM
      || 'Play Bookings <bookings@notifications.playbookings.com>',
    replyTo: process.env.BOOKING_EMAIL_REPLY_TO || 'jensen@playbookings.com',
    bcc: splitEmailList(
      process.env.BOOKING_EMAIL_BCC
      || 'jensen@playbookings.com,jensenmiers@gmail.com'
    ),
    overrideTo: process.env.BOOKING_EMAIL_OVERRIDE_TO?.trim() || null,
    appUrl: (
      process.env.NEXT_PUBLIC_APP_URL
      || 'https://www.playbookings.com'
    ).replace(/\/+$/, ''),
  }
}

export class SupabaseBookingConfirmationEmailStore
implements BookingConfirmationEmailStore {
  async getByBookingId(bookingId: string): Promise<BookingConfirmationEmailRecord | null> {
    const supabase = createAdminClient()
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        renter_id,
        venue_id,
        date,
        start_time,
        end_time,
        total_amount,
        status,
        confirmation_email_sent_at
      `)
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingError) {
      throw new Error(`Failed to load booking confirmation data: ${bookingError.message}`)
    }

    if (!booking) {
      return null
    }

    const [renterResult, venueResult] = await Promise.all([
      supabase
        .from('users')
        .select('email, first_name')
        .eq('id', booking.renter_id)
        .maybeSingle(),
      supabase
        .from('venues')
        .select('name, address, city, state, zip_code, booking_mode')
        .eq('id', booking.venue_id)
        .maybeSingle(),
    ])

    if (renterResult.error) {
      throw new Error(`Failed to load booking renter: ${renterResult.error.message}`)
    }

    if (venueResult.error) {
      throw new Error(`Failed to load booking venue: ${venueResult.error.message}`)
    }

    if (!renterResult.data?.email || !venueResult.data) {
      return null
    }

    return {
      bookingId: booking.id,
      renterEmail: renterResult.data.email,
      renterFirstName: renterResult.data.first_name,
      venueName: venueResult.data.name,
      venueAddress: venueResult.data.address,
      venueCity: venueResult.data.city,
      venueState: venueResult.data.state,
      venueZipCode: venueResult.data.zip_code,
      date: booking.date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      totalAmount: Number(booking.total_amount),
      status: booking.status as BookingStatus,
      confirmationEmailSentAt: booking.confirmation_email_sent_at,
      paidOnline: venueResult.data.booking_mode !== 'request_to_book',
    }
  }

  async markSent(bookingId: string, resendEmailId: string, sentAt: string): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('bookings')
      .update({
        confirmation_email_resend_id: resendEmailId,
        confirmation_email_sent_at: sentAt,
      })
      .eq('id', bookingId)

    if (error) {
      throw new BookingConfirmationEmailDeliveryError(
        `Resend accepted the booking confirmation, but tracking failed: ${error.message}`
      )
    }
  }
}

export class BookingConfirmationEmailService {
  private readonly store: BookingConfirmationEmailStore
  private readonly resend: ResendEmailClient
  private readonly config: BookingEmailConfig

  constructor(dependencies: BookingConfirmationEmailServiceDependencies = {}) {
    this.store = dependencies.store || new SupabaseBookingConfirmationEmailStore()
    this.config = dependencies.config || readBookingEmailConfig()
    this.resend = dependencies.resend || new LazyResendEmailClient(this.config.apiKey)
  }

  async sendIfNeeded(
    bookingId: string
  ): Promise<
    | { status: 'sent'; emailId: string }
    | { status: 'already_sent' }
    | { status: 'not_confirmed' }
  > {
    if (!this.config.apiKey) {
      throw new BookingConfirmationEmailDeliveryError('RESEND_API_KEY is not configured')
    }

    const booking = await this.store.getByBookingId(bookingId)

    if (!booking) {
      throw new BookingConfirmationEmailDataError(
        `Booking confirmation data not found for ${bookingId}`
      )
    }

    if (booking.confirmationEmailSentAt) {
      return { status: 'already_sent' }
    }

    if (booking.status !== 'confirmed') {
      return { status: 'not_confirmed' }
    }

    const stateAndZip = [
      booking.venueState,
      booking.venueZipCode,
    ].filter(Boolean).join(' ')
    const venueAddress = [
      booking.venueAddress,
      [booking.venueCity, stateAndZip].filter(Boolean).join(', '),
    ].filter(Boolean).join(', ')
    const bookingUrl = `${this.config.appUrl}/my-bookings/${encodeURIComponent(booking.bookingId)}`
    const content = buildBookingConfirmationEmail({
      bookingId: booking.bookingId,
      renterFirstName: booking.renterFirstName,
      venueName: booking.venueName,
      venueAddress,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.totalAmount,
      bookingUrl,
      replyTo: this.config.replyTo,
      paidOnline: booking.paidOnline,
    })
    const isOverridden = Boolean(this.config.overrideTo)
    const payload: CreateEmailOptions = {
      from: this.config.from,
      to: [this.config.overrideTo || booking.renterEmail],
      replyTo: this.config.replyTo,
      subject: isOverridden
        ? `[TEST for ${booking.renterEmail}] ${content.subject}`
        : content.subject,
      react: content.react,
      text: content.text,
      ...(isOverridden || this.config.bcc.length === 0
        ? {}
        : { bcc: this.config.bcc }),
    }
    const { data, error } = await this.resend.emails.send(
      payload,
      { idempotencyKey: `booking-confirmation/${booking.bookingId}` }
    )

    if (error || !data?.id) {
      throw new BookingConfirmationEmailDeliveryError(
        `Failed to send booking confirmation: ${error?.message || 'Resend returned no email ID'}`
      )
    }

    const sentAt = new Date().toISOString()
    await this.store.markSent(booking.bookingId, data.id, sentAt)

    return { status: 'sent', emailId: data.id }
  }
}
