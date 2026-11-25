import {
  BookingRequestEmailService,
  type BookingRequestEmailRecord,
} from '../bookingRequestEmailService'
import type { BookingEmailConfig, ResendEmailClient } from '../bookingConfirmationEmailService'

const record: BookingRequestEmailRecord = {
  bookingId: 'booking-1',
  renterEmail: 'renter@example.com',
  renterName: 'Sam Rivera',
  renterPhone: '323-555-0100',
  venueName: 'First Presbyterian Church of Hollywood',
  date: '2026-11-28',
  startTime: '08:00:00',
  endTime: '10:00:00',
  totalAmount: 120,
  activity: 'Pickup run',
  notes: 'Ten of us, half court is fine.',
}

const baseConfig: BookingEmailConfig = {
  apiKey: 'test-key',
  from: 'Play Bookings <bookings@example.com>',
  replyTo: 'jensen@playbookings.com',
  bcc: ['jensen@playbookings.com', 'jensenmiers@gmail.com'],
  overrideTo: null,
  appUrl: 'https://www.playbookings.com',
}

function setup(config: Partial<BookingEmailConfig> = {}, sendImpl?: jest.Mock) {
  const send = sendImpl || jest.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
  const resend = { emails: { send } } as unknown as ResendEmailClient
  const service = new BookingRequestEmailService({
    store: { getByBookingId: jest.fn().mockResolvedValue(record) },
    resend,
    config: { ...baseConfig, ...config },
  })
  return { service, send }
}

describe('BookingRequestEmailService', () => {
  it('sends the admins a request notice with the renter\'s contact details, replying to the business address', async () => {
    const { service, send } = setup()

    await service.sendRequestReceived('booking-1')

    const [adminPayload, adminOptions] = send.mock.calls[0]
    expect(adminPayload.to).toEqual(['jensen@playbookings.com', 'jensenmiers@gmail.com'])
    expect(adminPayload.replyTo).toBe('jensen@playbookings.com')
    expect(adminPayload.text).toContain('renter@example.com')
    expect(adminPayload.subject).toContain('New request')
    expect(adminPayload.subject).toContain('Pickup run')
    expect(adminPayload.text).toContain('323-555-0100')
    expect(adminPayload.text).toContain('Ten of us, half court is fine.')
    expect(adminOptions).toEqual({ idempotencyKey: 'booking-request-admin/booking-1' })
  })

  it('sends the renter a receipt saying they are not booked yet', async () => {
    const { service, send } = setup()

    await service.sendRequestReceived('booking-1')

    const [receiptPayload, receiptOptions] = send.mock.calls[1]
    expect(receiptPayload.to).toEqual(['renter@example.com'])
    expect(receiptPayload.text).toContain("You're not booked yet")
    expect(receiptPayload.text).toContain('within 24 hours')
    expect(receiptPayload.text).toContain('$120.00')
    expect(receiptOptions).toEqual({ idempotencyKey: 'booking-request-receipt/booking-1' })
  })

  it('routes both emails to the override address in test environments', async () => {
    const { service, send } = setup({ overrideTo: 'qa@example.com' })

    await service.sendRequestReceived('booking-1')

    expect(send.mock.calls[0][0].to).toEqual(['qa@example.com'])
    expect(send.mock.calls[1][0].to).toEqual(['qa@example.com'])
    expect(send.mock.calls[1][0].subject).toContain('[TEST for renter@example.com]')
  })

  it('still sends the receipt when the admin notice fails, then reports the failure', async () => {
    const send = jest.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'rate limited' } })
      .mockResolvedValueOnce({ data: { id: 'email-2' }, error: null })
    const { service } = setup({}, send)

    await expect(service.sendRequestReceived('booking-1')).rejects.toThrow('admin notice: rate limited')
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('sends the decline to the renter with the reason, copying the admins', async () => {
    const { service, send } = setup()

    await service.sendDeclined('booking-1', 'The gym has a church event that morning.')

    const [payload, options] = send.mock.calls[0]
    expect(payload.to).toEqual(['renter@example.com'])
    expect(payload.bcc).toEqual(['jensen@playbookings.com', 'jensenmiers@gmail.com'])
    expect(payload.subject).toContain('Not available')
    expect(payload.text).toContain('The gym has a church event that morning.')
    expect(options).toEqual({ idempotencyKey: 'booking-request-declined/booking-1' })
  })

  it('refuses to send without a Resend API key', async () => {
    const { service, send } = setup({ apiKey: '' })

    await expect(service.sendRequestReceived('booking-1')).rejects.toThrow('RESEND_API_KEY')
    expect(send).not.toHaveBeenCalled()
  })
})
