import { renderToStaticMarkup } from 'react-dom/server'
import {
  BookingConfirmationEmailDataError,
  BookingConfirmationEmailDeliveryError,
  BookingConfirmationEmailService,
  type BookingConfirmationEmailRecord,
  type BookingConfirmationEmailStore,
  type ResendEmailClient,
} from '@/services/bookingConfirmationEmailService'

const record: BookingConfirmationEmailRecord = {
  bookingId: 'booking-123',
  renterEmail: 'renter@example.com',
  renterFirstName: 'Jensen',
  venueName: 'Memorial Park Gym',
  venueAddress: '1401 Olympic Blvd',
  venueCity: 'Santa Monica',
  venueState: 'CA',
  venueZipCode: '90404',
  date: '2026-08-05',
  startTime: '18:30:00',
  endTime: '20:00:00',
  totalAmount: 175,
  status: 'confirmed',
  confirmationEmailSentAt: null,
}

function createStore(overrides: Partial<BookingConfirmationEmailStore> = {}) {
  return {
    getByBookingId: jest.fn().mockResolvedValue(record),
    markSent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<BookingConfirmationEmailStore>
}

function createResendClient() {
  return {
    emails: {
      send: jest.fn().mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      }),
    },
  } as unknown as jest.Mocked<ResendEmailClient>
}

const config = {
  apiKey: 're_test',
  from: 'Play Bookings <bookings@notifications.playbookings.com>',
  replyTo: 'jensen@playbookings.com',
  bcc: ['jensen@playbookings.com', 'jensenmiers@gmail.com'],
  overrideTo: null,
  appUrl: 'https://www.playbookings.com',
}

describe('BookingConfirmationEmailService', () => {
  it('sends once to the renter with private owner copies and marks the booking sent', async () => {
    const store = createStore()
    const resend = createResendClient()
    const service = new BookingConfirmationEmailService({ store, resend, config })

    const result = await service.sendIfNeeded('booking-123')

    expect(result).toEqual({ status: 'sent', emailId: 'email-123' })
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: config.from,
        to: ['renter@example.com'],
        bcc: config.bcc,
        replyTo: config.replyTo,
        subject: 'Booking confirmed: Memorial Park Gym — August 5, 2026',
      }),
      { idempotencyKey: 'booking-confirmation/booking-123' }
    )
    const [message] = resend.emails.send.mock.calls[0]
    expect(renderToStaticMarkup(message.react as React.ReactElement)).toContain(
      '1401 Olympic Blvd, Santa Monica, CA 90404'
    )
    expect(store.markSent).toHaveBeenCalledWith(
      'booking-123',
      'email-123',
      expect.any(String)
    )
  })

  it('reroutes development email and removes BCC recipients', async () => {
    const store = createStore()
    const resend = createResendClient()
    const service = new BookingConfirmationEmailService({
      store,
      resend,
      config: {
        ...config,
        overrideTo: 'jensenmiers@gmail.com',
      },
    })

    await service.sendIfNeeded('booking-123')

    const [message] = resend.emails.send.mock.calls[0]
    expect(message.to).toEqual(['jensenmiers@gmail.com'])
    expect(message.bcc).toBeUndefined()
    expect(message.subject).toBe(
      '[TEST for renter@example.com] Booking confirmed: Memorial Park Gym — August 5, 2026'
    )
  })

  it('does not send a booking that already has a sent timestamp', async () => {
    const store = createStore({
      getByBookingId: jest.fn().mockResolvedValue({
        ...record,
        confirmationEmailSentAt: '2026-07-25T12:00:00.000Z',
      }),
    })
    const resend = createResendClient()
    const service = new BookingConfirmationEmailService({ store, resend, config })

    await expect(service.sendIfNeeded('booking-123')).resolves.toEqual({
      status: 'already_sent',
    })
    expect(resend.emails.send).not.toHaveBeenCalled()
    expect(store.markSent).not.toHaveBeenCalled()
  })

  it('rejects records that are not confirmed', async () => {
    const store = createStore({
      getByBookingId: jest.fn().mockResolvedValue({
        ...record,
        status: 'pending',
      }),
    })
    const resend = createResendClient()
    const service = new BookingConfirmationEmailService({ store, resend, config })

    await expect(service.sendIfNeeded('booking-123')).resolves.toEqual({
      status: 'not_confirmed',
    })
    expect(resend.emails.send).not.toHaveBeenCalled()
  })

  it('leaves the booking unmarked when Resend rejects the email', async () => {
    const store = createStore()
    const resend = createResendClient()
    resend.emails.send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'Temporary failure' },
    } as never)
    const service = new BookingConfirmationEmailService({ store, resend, config })

    await expect(service.sendIfNeeded('booking-123')).rejects.toBeInstanceOf(
      BookingConfirmationEmailDeliveryError
    )
    expect(store.markSent).not.toHaveBeenCalled()
  })

  it('fails before sending when the booking data is missing', async () => {
    const store = createStore({
      getByBookingId: jest.fn().mockResolvedValue(null),
    })
    const resend = createResendClient()
    const service = new BookingConfirmationEmailService({ store, resend, config })

    await expect(service.sendIfNeeded('missing')).rejects.toBeInstanceOf(
      BookingConfirmationEmailDataError
    )
    expect(resend.emails.send).not.toHaveBeenCalled()
  })
})
