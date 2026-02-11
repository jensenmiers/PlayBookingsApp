/**
 * Tests for SlotBookingConfirmation
 * Renders BookingPaymentFlow with variant="wizard"
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SlotBookingConfirmation } from '../slot-booking-confirmation'
import type { Venue } from '@/types'

const mockMutate = jest.fn()
const mockOpenAuthModal = jest.fn()
const mockToast = jest.fn()
const mockCreateIntent = jest.fn()
const mockCreateSetupIntent = jest.fn()
const mockDeleteBooking = jest.fn()

jest.mock('@/hooks/useBookings', () => ({
  useCreateBooking: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
    reset: jest.fn(),
  }),
}))

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: jest.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  })),
}))

jest.mock('@/hooks/usePaymentIntent', () => ({
  useCreatePaymentIntent: () => ({
    createIntent: mockCreateIntent,
    loading: false,
    error: null,
    reset: jest.fn(),
  }),
  useCreateSetupIntent: () => ({
    createSetupIntent: mockCreateSetupIntent,
    loading: false,
    error: null,
    reset: jest.fn(),
  }),
  useDeleteUnpaidBooking: () => ({
    deleteBooking: mockDeleteBooking,
  }),
}))

jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
  }),
}))

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    toasts: [],
  }),
}))

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}))

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}))

describe('SlotBookingConfirmation', () => {
  const mockVenue: Venue = {
    id: 'venue-123',
    name: 'Test Court',
    description: 'A test venue',
    address: '123 Test St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    owner_id: 'owner-123',
    hourly_rate: 120,
    instant_booking: true,
    insurance_required: false,
    max_advance_booking_days: 180,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    venue: mockVenue,
    date: '2026-02-10',
    startTime: '19:00:00',
    endTime: '20:00:00',
    onSuccess: jest.fn(),
  }

  const createBookingResponse = {
    id: 'booking-123',
    venue_id: 'venue-123',
    renter_id: 'user-123',
    date: '2026-02-10',
    start_time: '19:00:00',
    end_time: '20:00:00',
    status: 'pending',
    total_amount: 120,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none' as const,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateIntent.mockResolvedValue({ data: null, error: 'mock' })
    mockCreateSetupIntent.mockResolvedValue({ data: null, error: 'mock' })
  })

  it('renders wizard dialog with Booking Details title', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByText('Booking Details')).toBeInTheDocument()
  })

  it('renders venue name and location', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByText('Test Court')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
  })

  it('displays formatted date and time', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByText('Tuesday, February 10, 2026')).toBeInTheDocument()
    expect(screen.getByText('7:00 PM - 8:00 PM')).toBeInTheDocument()
  })

  it('calculates and displays pricing correctly', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByText('$120/hr × 1 hour')).toBeInTheDocument()
    expect(screen.getAllByText('$120.00').length).toBeGreaterThanOrEqual(1)
  })

  it('shows Continue to Payment button', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument()
  })

  it('calls createBooking.mutate when Continue to Payment is clicked', async () => {
    mockMutate.mockResolvedValueOnce({ data: createBookingResponse, error: null })

    render(<SlotBookingConfirmation {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        venue_id: 'venue-123',
        date: '2026-02-10',
        start_time: '19:00:00',
        end_time: '20:00:00',
        recurring_type: 'none',
      })
    })
  })

  it('shows instant booking payment message', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.getByText(/charged immediately to confirm this booking/i)).toBeInTheDocument()
  })

  it('shows deferred payment message for non-instant venues', () => {
    const nonInstantVenue = { ...mockVenue, instant_booking: false }
    render(<SlotBookingConfirmation {...defaultProps} venue={nonInstantVenue} />)
    expect(screen.getByText(/charged after approval/i)).toBeInTheDocument()
  })

  it('does not show deferred message for instant booking venues', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    expect(screen.queryByText(/venue owner approval/i)).not.toBeInTheDocument()
  })

  it('opens auth modal if user is not logged in', async () => {
    const { useCurrentUser } = await import('@/hooks/useCurrentUser')
    jest.mocked(useCurrentUser).mockReturnValueOnce({ user: null, loading: false })

    render(<SlotBookingConfirmation {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    expect(mockOpenAuthModal).toHaveBeenCalledWith({
      contextMessage: 'Sign in to complete your booking',
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('closes dialog when Cancel is clicked', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not show success toast when booking creation fails', async () => {
    mockMutate.mockResolvedValueOnce({ data: null, error: 'Booking failed' })

    render(<SlotBookingConfirmation {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled()
    })

    expect(mockToast).not.toHaveBeenCalled()
    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
  })
})
