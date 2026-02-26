/**
 * Unit tests for SplitAvailabilityView
 * Focuses on the opt-in location button behavior
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { SplitAvailabilityView } from '../split-availability-view'

const mockRequestLocation = jest.fn()

jest.mock('@/hooks/useVenuesWithNextAvailable', () => ({
  useVenuesWithNextAvailable: jest.fn(),
  useUserLocation: jest.fn(() => ({
    latitude: null,
    longitude: null,
    loading: false,
    requestLocation: mockRequestLocation,
  })),
}))

jest.mock('@/components/maps/availability-map', () => ({
  AvailabilityMap: () => <div data-testid="availability-map">Map</div>,
}))

const useVenuesWithNextAvailable = jest.requireMock('@/hooks/useVenuesWithNextAvailable').useVenuesWithNextAvailable
const useUserLocation = jest.requireMock('@/hooks/useVenuesWithNextAvailable').useUserLocation

const mockVenue = {
  id: 'venue-1',
  name: 'Test Venue',
  city: 'Los Angeles',
  state: 'CA',
  address: '123 Test St',
  hourlyRate: 50,
  instantBooking: true,
  insuranceRequired: false,
  latitude: 34.05,
  longitude: -118.24,
  distanceMiles: null as number | null,
  nextAvailable: {
    slotId: 'slot-1',
    date: '2026-02-10',
    startTime: '14:00:00',
    endTime: '15:00:00',
    displayText: 'Today 2:00 PM',
  },
}

describe('SplitAvailabilityView - Location button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [mockVenue],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
    ;(useUserLocation as jest.Mock).mockReturnValue({
      latitude: null,
      longitude: null,
      loading: false,
      requestLocation: mockRequestLocation,
    })
  })

  it('renders location button with aria-label', () => {
    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })
    expect(button).toBeInTheDocument()
  })

  it('renders location button with title for tooltip', () => {
    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })
    expect(button).toHaveAttribute('title', 'Use my location')
  })

  it('calls requestLocation when clicked and no location yet', () => {
    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })

    fireEvent.click(button)

    expect(mockRequestLocation).toHaveBeenCalledTimes(1)
  })

  it('does not call requestLocation when already has location', () => {
    ;(useUserLocation as jest.Mock).mockReturnValue({
      latitude: 34.05,
      longitude: -118.24,
      loading: false,
      requestLocation: mockRequestLocation,
    })

    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })

    fireEvent.click(button)

    expect(mockRequestLocation).not.toHaveBeenCalled()
  })

  it('disables button when location is loading', () => {
    ;(useUserLocation as jest.Mock).mockReturnValue({
      latitude: null,
      longitude: null,
      loading: true,
      requestLocation: mockRequestLocation,
    })

    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })

    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(mockRequestLocation).not.toHaveBeenCalled()
  })

  it('shows active state when location is available', () => {
    ;(useUserLocation as jest.Mock).mockReturnValue({
      latitude: 34.05,
      longitude: -118.24,
      loading: false,
      requestLocation: mockRequestLocation,
    })

    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })

    expect(button).toHaveClass('bg-primary-400/15')
  })

  it('shows inactive state when no location', () => {
    render(<SplitAvailabilityView />)
    const button = screen.getByRole('button', { name: /use my location/i })

    expect(button).toHaveClass('bg-secondary-50/5')
  })

  it('renders mobile map/list toggle before date filter controls', () => {
    render(<SplitAvailabilityView />)

    const mapToggleButton = screen.getByRole('button', { name: /^map$/i })
    const anyDateButton = screen.getByRole('button', { name: /any date/i })

    expect(mapToggleButton.compareDocumentPosition(anyDateButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('adds desktop horizontal gutters to the split view shell', () => {
    const { container } = render(<SplitAvailabilityView />)
    const root = container.firstElementChild

    expect(root).toHaveClass('lg:px-4')
  })
})
