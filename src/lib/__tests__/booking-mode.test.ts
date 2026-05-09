import { getBookingModeDisplay, BOOKING_APPROVAL_COPY } from '@/lib/booking-mode'

describe('booking-mode', () => {
  it('returns compact instant display metadata', () => {
    const result = getBookingModeDisplay(true, 'compact')

    expect(result.mode).toBe('instant')
    expect(result.label).toBe('Instant')
    expect(result.icon.iconName).toBe('bolt')
  })

  it('returns full instant display metadata', () => {
    const result = getBookingModeDisplay(true, 'full')

    expect(result.mode).toBe('instant')
    expect(result.label).toBe('Book Instantly')
    expect(result.icon.iconName).toBe('bolt')
  })

  it('returns compact approval display metadata', () => {
    const result = getBookingModeDisplay(false, 'compact')

    expect(result.mode).toBe('approval')
    expect(result.label).toBe('Host Approval')
    expect(result.icon.iconName).toBe('clock')
  })

  it('returns full approval display metadata', () => {
    const result = getBookingModeDisplay(false, 'full')

    expect(result.mode).toBe('approval')
    expect(result.label).toBe('Host Approval')
    expect(result.icon.iconName).toBe('clock')
  })

  it('returns request-to-book display metadata', () => {
    const result = getBookingModeDisplay('request_to_book', 'compact')

    expect(result.mode).toBe('request')
    expect(result.label).toBe('Request to book')
    expect(result.icon.iconName).toBe('paper-plane')
  })

  it('exposes canonical host-approval copy for renter flows', () => {
    expect(BOOKING_APPROVAL_COPY.discoveryLabel).toBe('Host Approval')
    expect(BOOKING_APPROVAL_COPY.pendingStatusLabel).toBe('Host Approval Pending')
    expect(BOOKING_APPROVAL_COPY.confirmationDialogTitle).toBe('Host Approval')
    expect(BOOKING_APPROVAL_COPY.confirmationDialogBody).toContain('host approval')
  })

  it('formats deferred success copy with host approval pending state', () => {
    expect(BOOKING_APPROVAL_COPY.deferredSuccessDescription('Crosscourt')).toContain(
      'Host Approval Pending'
    )
    expect(BOOKING_APPROVAL_COPY.deferredSuccessDescription('Crosscourt')).toContain(
      'Crosscourt'
    )
  })
})
