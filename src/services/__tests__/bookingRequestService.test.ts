import { BookingRequestService } from '../bookingRequestService'

type Row = Record<string, unknown>

function makeAdminClient({
  booking,
  venue = { booking_mode: 'request_to_book', instant_booking: false },
  updatedBooking,
  auditError = null,
}: {
  booking: Row | null
  venue?: Row | null
  updatedBooking?: Row | null
  auditError?: { message: string } | null
}) {
  const bookingUpdate = jest.fn()
  const updateEqStatus = jest.fn()
  const auditInsert = jest.fn().mockResolvedValue({ error: auditError })

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'bookings') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: booking, error: null }),
          }),
        }),
        update: bookingUpdate.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: updateEqStatus.mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: updatedBooking === undefined ? booking : updatedBooking,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'venues') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: venue, error: null }),
          }),
        }),
      }
    }
    if (table === 'audit_logs') {
      return { insert: auditInsert }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return { client: { from }, bookingUpdate, updateEqStatus, auditInsert }
}

const pendingBooking = {
  id: 'booking-1',
  venue_id: 'venue-1',
  renter_id: 'renter-1',
  status: 'pending',
}

function setup(clientOptions: Parameters<typeof makeAdminClient>[0]) {
  const admin = makeAdminClient(clientOptions)
  const confirmationEmail = { sendIfNeeded: jest.fn().mockResolvedValue({ status: 'sent', emailId: 'e1' }) }
  const requestEmail = { sendDeclined: jest.fn().mockResolvedValue(undefined) }
  const service = new BookingRequestService({
    adminClient: () => admin.client as never,
    confirmationEmail,
    requestEmail,
  })
  return { service, admin, confirmationEmail, requestEmail }
}

describe('BookingRequestService', () => {
  it('confirms a pending request, logs it, and emails the renter', async () => {
    const { service, admin, confirmationEmail } = setup({
      booking: pendingBooking,
      updatedBooking: { ...pendingBooking, status: 'confirmed' },
    })

    const result = await service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })

    expect(admin.bookingUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }))
    expect(admin.updateEqStatus).toHaveBeenCalledWith('status', 'pending')
    expect(admin.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'bookings',
      record_id: 'booking-1',
      action: 'update',
      new_values: expect.objectContaining({ request_decision: 'confirmed' }),
      user_id: 'admin-1',
    }))
    expect(confirmationEmail.sendIfNeeded).toHaveBeenCalledWith('booking-1')
    expect(result).toEqual({ booking: expect.objectContaining({ status: 'confirmed' }), emailSent: true })
  })

  it('declines a pending request as cancelled, keeps the reason in the log, and emails it', async () => {
    const { service, admin, requestEmail } = setup({
      booking: pendingBooking,
      updatedBooking: { ...pendingBooking, status: 'cancelled' },
    })

    const result = await service.decline({
      venueId: 'venue-1',
      bookingId: 'booking-1',
      adminUserId: 'admin-1',
      reason: 'Church event that morning',
    })

    expect(admin.bookingUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    expect(admin.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      new_values: expect.objectContaining({
        request_decision: 'declined',
        decline_reason: 'Church event that morning',
      }),
    }))
    expect(requestEmail.sendDeclined).toHaveBeenCalledWith('booking-1', 'Church event that morning')
    expect(result.emailSent).toBe(true)
  })

  it('keeps the decision when the email fails and reports it', async () => {
    const { service, confirmationEmail } = setup({
      booking: pendingBooking,
      updatedBooking: { ...pendingBooking, status: 'confirmed' },
    })
    confirmationEmail.sendIfNeeded.mockRejectedValue(new Error('Resend down'))
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })

    expect(result.emailSent).toBe(false)
    expect(result.booking.status).toBe('confirmed')
    consoleError.mockRestore()
  })

  it('still emails the renter when the audit log write fails', async () => {
    const { service, confirmationEmail } = setup({
      booking: pendingBooking,
      updatedBooking: { ...pendingBooking, status: 'confirmed' },
      auditError: { message: 'violates check constraint' },
    })
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })

    expect(confirmationEmail.sendIfNeeded).toHaveBeenCalledWith('booking-1')
    expect(result.emailSent).toBe(true)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('refuses a request that is not pending', async () => {
    const { service, admin } = setup({ booking: { ...pendingBooking, status: 'confirmed' } })

    await expect(
      service.decline({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(admin.bookingUpdate).not.toHaveBeenCalled()
  })

  it('refuses a booking from another venue', async () => {
    const { service } = setup({ booking: { ...pendingBooking, venue_id: 'venue-2' } })

    await expect(
      service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('refuses bookings at venues that take payment, so the payment flow is never skipped', async () => {
    const { service, admin } = setup({
      booking: pendingBooking,
      venue: { booking_mode: 'instant_slots', instant_booking: true },
    })

    await expect(
      service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(admin.bookingUpdate).not.toHaveBeenCalled()
  })

  it('reports a conflict when the request was answered in the meantime', async () => {
    const { service, admin } = setup({ booking: pendingBooking, updatedBooking: null })

    await expect(
      service.confirm({ venueId: 'venue-1', bookingId: 'booking-1', adminUserId: 'admin-1' })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(admin.auditInsert).not.toHaveBeenCalled()
  })

  it('returns not found for a missing booking', async () => {
    const { service } = setup({ booking: null })

    await expect(
      service.confirm({ venueId: 'venue-1', bookingId: 'missing', adminUserId: 'admin-1' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
