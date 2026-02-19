import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BookingList } from '../booking-list'
import type { BookingWithVenue } from '@/types'

const mockUseBookings = jest.fn()
const mockCancelBooking = jest.fn()

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('@/components/payments/payment-modal', () => ({
  PaymentModal: () => null,
}))

jest.mock('@/hooks/useBookings', () => ({
  useBookings: (params: unknown) => mockUseBookings(params),
  useCancelBooking: () => ({
    mutate: mockCancelBooking,
    loading: false,
    error: null,
  }),
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
      expect(mockUseBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          time_view: 'past',
        })
      )
    })
  })

  it('shows Expired label and hides pay/cancel actions for past pending bookings', () => {
    mockUseBookings.mockReturnValue({
      data: [createBooking()],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<BookingList initialFilters={{ role_view: 'renter', time_view: 'past' }} />)

    expect(screen.getByText('Expired')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
  })
})
