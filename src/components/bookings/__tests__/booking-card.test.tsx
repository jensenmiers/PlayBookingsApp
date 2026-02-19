import { fireEvent, render, screen } from '@testing-library/react'
import { BookingCard } from '../booking-card'
import type { BookingWithVenue } from '@/types'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div aria-label={alt} />,
}))

describe('BookingCard', () => {
  const createBooking = (overrides: Partial<BookingWithVenue> = {}): BookingWithVenue => ({
    id: 'booking-1',
    venue_id: 'venue-1',
    renter_id: 'user-1',
    date: '2026-02-19',
    start_time: '14:00:00',
    end_time: '15:00:00',
    status: 'pending',
    total_amount: 150,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    venue: {
      id: 'venue-1',
      name: 'Main Court',
      instant_booking: true,
      insurance_required: false,
      photos: [],
    },
    ...overrides,
  })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 19, 12, 0, 0))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders relative date text and booking details', () => {
    render(<BookingCard booking={createBooking()} onPayClick={jest.fn()} />)

    expect(screen.getByText('Main Court')).toBeInTheDocument()
    expect(screen.getByText(/Today/i)).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/my-bookings/booking-1')
  })

  it('fires onPayClick for payable bookings', () => {
    const onPayClick = jest.fn()
    const booking = createBooking()

    render(<BookingCard booking={booking} onPayClick={onPayClick} />)

    fireEvent.click(screen.getByRole('button', { name: /pay \$150\.00/i }))

    expect(onPayClick).toHaveBeenCalledWith(booking)
  })

  it('does not render pay button for confirmed bookings', () => {
    render(
      <BookingCard
        booking={createBooking({ status: 'confirmed' })}
        onPayClick={jest.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument()
  })
})
