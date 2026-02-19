import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BookingList } from '../booking-list'
import type { BookingWithVenue } from '@/types'

const mockUseBookings = jest.fn()

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

jest.mock('@/components/payments/payment-modal', () => ({
  PaymentModal: () => null,
}))

jest.mock('@/hooks/useBookings', () => ({
  useBookings: (params: unknown) => mockUseBookings(params),
}))

describe('BookingList', () => {
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
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2026, 1, 19, 15, 0, 0))

    mockUseBookings.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('defaults to time_view=upcoming', () => {
    render(<BookingList initialFilters={{ role_view: 'renter' }} />)

    expect(mockUseBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        time_view: 'upcoming',
      })
    )
  })

  it('switches to time_view=past when Past is selected', async () => {
    render(<BookingList initialFilters={{ role_view: 'renter' }} />)

    fireEvent.click(screen.getByRole('button', { name: /past/i }))

    await waitFor(() => {
      expect(mockUseBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          time_view: 'past',
          page: '1',
        })
      )
    })
  })

  it('applies status chip filters', async () => {
    render(<BookingList initialFilters={{ role_view: 'renter' }} />)

    fireEvent.click(screen.getByRole('button', { name: /pending/i }))

    await waitFor(() => {
      expect(mockUseBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'pending',
          page: '1',
        })
      )
    })
  })

  it('shows upcoming empty state with browse courts link', () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'upcoming' }} />)

    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse courts/i })).toHaveAttribute('href', '/search')
  })

  it('shows past empty state without browse courts link', async () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'upcoming' }} />)

    fireEvent.click(screen.getByRole('button', { name: /past/i }))

    await waitFor(() => {
      expect(screen.getByText('No past bookings')).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: /browse courts/i })).not.toBeInTheDocument()
  })

  it('shows only upcoming-allowed status chips', () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'upcoming' }} />)

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelled/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /completed/i })).not.toBeInTheDocument()
  })

  it('shows only past-allowed status chips', async () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'upcoming' }} />)

    fireEvent.click(screen.getByRole('button', { name: /past/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelled/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /pending/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirmed/i })).not.toBeInTheDocument()
  })

  it('resets invalid status when switching to past', async () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'upcoming' }} />)

    fireEvent.click(screen.getByRole('button', { name: /pending/i }))
    fireEvent.click(screen.getByRole('button', { name: /past/i }))

    await waitFor(() => {
      expect(mockUseBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          time_view: 'past',
          status: undefined,
          page: '1',
        })
      )
    })
  })

  it('normalizes invalid initial status', () => {
    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'past', status: 'pending' }} />)

    expect(mockUseBookings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        time_view: 'past',
        status: undefined,
      })
    )
  })

  it('moves to the next page when Next is clicked', async () => {
    mockUseBookings.mockReturnValue({
      data: [createBooking()],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<BookingList initialFilters={{ role_view: 'renter', limit: '1' }} />)

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }))

    await waitFor(() => {
      expect(mockUseBookings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: '2',
          limit: '1',
        })
      )
    })
  })
})
