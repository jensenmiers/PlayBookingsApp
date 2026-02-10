/**
 * Integration tests for SlotBookingConfirmation component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SlotBookingConfirmation } from '../slot-booking-confirmation'
import type { Venue } from '@/types'

// Mock the hooks
const mockMutate = jest.fn()
const mockOpenAuthModal = jest.fn()
const mockToast = jest.fn()

jest.mock('@/hooks/useBookings', () => ({
  useCreateBooking: () => ({
    mutate: mockMutate,
    loading: false,
    error: null,
  }),
}))

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: jest.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  })),
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

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders confirmation dialog with venue details', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    expect(screen.getByText('Confirm Your Booking')).toBeInTheDocument()
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
    
    // $120/hr × 1 hour = $120
    expect(screen.getByText('$120/hr × 1 hour')).toBeInTheDocument()
    expect(screen.getAllByText('$120.00')).toHaveLength(2) // Price and total
  })

  it('calls createBooking.mutate when Confirm Booking is clicked', async () => {
    mockMutate.mockResolvedValueOnce({ data: { id: 'booking-123' } })
    
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
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

  it('shows success toast on successful booking', async () => {
    mockMutate.mockResolvedValueOnce({ data: { id: 'booking-123' } })
    
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Booking confirmed!',
        description: 'Test Court on Tuesday, February 10, 2026',
        variant: 'success',
      })
    })
  })

  it('calls onSuccess and closes dialog after successful booking', async () => {
    mockMutate.mockResolvedValueOnce({ data: { id: 'booking-123' } })
    
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('booking-123')
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('does not show toast when booking fails', async () => {
    mockMutate.mockResolvedValueOnce({ data: null, error: 'Booking failed' })
    
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled()
    })
    
    expect(mockToast).not.toHaveBeenCalled()
    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
  })

  it('opens auth modal if user is not logged in', async () => {
    const { useCurrentUser } = await import('@/hooks/useCurrentUser')
    jest.mocked(useCurrentUser).mockReturnValueOnce({ user: null, loading: false })

    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Confirm Booking'))
    
    expect(mockOpenAuthModal).toHaveBeenCalledWith({
      contextMessage: 'Sign in to complete your booking',
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows approval notice for non-instant booking venues', () => {
    const nonInstantVenue = { ...mockVenue, instant_booking: false }
    
    render(<SlotBookingConfirmation {...defaultProps} venue={nonInstantVenue} />)
    
    expect(screen.getByText(/Approval Required/)).toBeInTheDocument()
    expect(screen.getByText(/venue owner approval/)).toBeInTheDocument()
  })

  it('does not show approval notice for instant booking venues', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    expect(screen.queryByText(/Approval Required/)).not.toBeInTheDocument()
  })

  it('closes dialog when Cancel is clicked', () => {
    render(<SlotBookingConfirmation {...defaultProps} />)
    
    fireEvent.click(screen.getByText('Cancel'))
    
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
