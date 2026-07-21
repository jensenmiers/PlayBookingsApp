/**
 * Unit tests for SplitAvailabilityView
 * Focuses on date filter defaults, day picker, and location button behavior
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { format } from 'date-fns'
import { getDateStringInTimeZone } from '@/utils/dateHelpers'
import { SplitAvailabilityView } from '../split-availability-view'

const mockRequestLocation = jest.fn()
const PLATFORM_TIME_ZONE = 'America/Los_Angeles'

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

jest.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
    disabled,
  }: {
    onSelect?: (date: Date | undefined) => void
    disabled?: (date: Date) => boolean
  }) => (
    <div data-testid="date-picker-calendar">
      <button type="button" onClick={() => onSelect?.(new Date(2026, 6, 20))}>
        Select July 20
      </button>
      <span data-testid="calendar-disabled-la-today">
        {String(Boolean(disabled?.(new Date(2026, 6, 16))))}
      </span>
      <span data-testid="calendar-disabled-day-before-la-today">
        {String(Boolean(disabled?.(new Date(2026, 6, 15))))}
      </span>
    </div>
  ),
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
  bookingMode: 'instant_slots',
  insuranceRequired: false,
  offersOpenGym: false,
  offersPrivateRental: true,
  dropInPrice: null as number | null,
  latitude: 34.05,
  longitude: -118.24,
  distanceMiles: null as number | null,
  venueType: 'Sports Facility',
  photo: null as string | null,
  nextAvailable: {
    slotId: 'slot-1',
    date: '2026-02-10',
    startTime: '14:00:00',
    endTime: '15:00:00',
    displayText: 'Tue Feb 10, 2 PM',
  },
}

const mockNonInstantVenue = {
  ...mockVenue,
  id: 'venue-2',
  name: 'Request Court',
  instantBooking: false,
  bookingMode: 'approval_slots',
}

const mockRequestToBookVenue = {
  ...mockVenue,
  id: 'venue-3',
  name: 'Request A Time Court',
  instantBooking: false,
  bookingMode: 'request_to_book',
}

const mockHybridOpenGymVenue = {
  ...mockVenue,
  id: 'venue-4',
  name: 'Memorial Park',
  instantBooking: false,
  bookingMode: 'request_to_book',
  offersOpenGym: true,
  offersPrivateRental: true,
  dropInPrice: 3,
  nextAvailable: null as null,
}

describe('SplitAvailabilityView - Location button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 2026-07-17 06:00 UTC is still 2026-07-16 evening in America/Los_Angeles
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-17T06:00:00.000Z'))
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

  afterEach(() => {
    jest.useRealTimers()
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
    const todayButton = screen.getByRole('button', { name: /today/i })

    expect(mapToggleButton.compareDocumentPosition(todayButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('defaults the date filter to America/Los_Angeles today, not the browser-local date', () => {
    const localToday = format(new Date(), 'yyyy-MM-dd')
    const laToday = getDateStringInTimeZone(new Date(), PLATFORM_TIME_ZONE)

    expect(localToday).toBe('2026-07-17')
    expect(laToday).toBe('2026-07-16')

    render(<SplitAvailabilityView />)

    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
    expect(useVenuesWithNextAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: laToday })
    )
    expect(useVenuesWithNextAvailable).not.toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: localToday })
    )
  })

  it('anchors previous-day navigation to America/Los_Angeles today', () => {
    render(<SplitAvailabilityView />)

    expect(useVenuesWithNextAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: '2026-07-16' })
    )
    expect(screen.getByRole('button', { name: /previous day/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /next day/i }))
    expect(useVenuesWithNextAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: '2026-07-17' })
    )
    expect(screen.getByRole('button', { name: /previous day/i })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))
    expect(useVenuesWithNextAvailable).toHaveBeenLastCalledWith(
      expect.objectContaining({ dateFilter: '2026-07-16' })
    )
    expect(screen.getByRole('button', { name: /previous day/i })).toBeDisabled()
  })

  it('keeps America/Los_Angeles today selectable in the calendar and disables days before it', () => {
    render(<SplitAvailabilityView />)

    fireEvent.click(screen.getByRole('button', { name: /today/i }))

    expect(screen.getByTestId('calendar-disabled-la-today')).toHaveTextContent('false')
    expect(screen.getByTestId('calendar-disabled-day-before-la-today')).toHaveTextContent('true')
  })

  it('opens a day picker from the date control and updates the search date on select', () => {
    render(<SplitAvailabilityView />)

    fireEvent.click(screen.getByRole('button', { name: /today/i }))
    expect(screen.getByTestId('date-picker-calendar')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /select july 20/i }))

    expect(screen.queryByTestId('date-picker-calendar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mon, jul 20/i })).toBeInTheDocument()
    expect(useVenuesWithNextAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: '2026-07-20' })
    )
  })

  it('does not render unimplemented Any time or Filters controls', () => {
    render(<SplitAvailabilityView />)

    expect(screen.queryByText(/any time/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument()
  })

  it('adds desktop horizontal gutters to the split view shell', () => {
    const { container } = render(<SplitAvailabilityView />)
    const root = container.firstElementChild

    expect(root).toHaveClass('lg:px-l')
  })

  it('shows Host Approval badge for non-instant venues in the list panel', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [mockNonInstantVenue],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    expect(screen.getByText('Host Approval')).toBeInTheDocument()
  })

  it('shows Request a time badge for request-to-book venues in the list panel', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [mockRequestToBookVenue],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    expect(screen.getByText('Request a time')).toBeInTheDocument()
    expect(screen.queryByText('Instant')).not.toBeInTheDocument()
  })

  it('renders next-available datetime on its own meta row above mode chips', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [{ ...mockVenue, insuranceRequired: true }],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    const datetimeRow = screen.getByTestId('venue-meta-datetime-row')
    const chipsRow = screen.getByTestId('venue-meta-chips-row')

    expect(datetimeRow).toHaveTextContent('Tue Feb 10, 2 PM')
    expect(datetimeRow).not.toHaveTextContent('Instant')
    expect(datetimeRow).not.toHaveTextContent('Insurance')
    expect(chipsRow).toHaveTextContent('Instant')
    expect(chipsRow).toHaveTextContent('Insurance')
    expect(chipsRow).toHaveTextContent('Book →')
    expect(datetimeRow.compareDocumentPosition(chipsRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps next-available datetime on one line', () => {
    render(<SplitAvailabilityView />)

    const datetimePill = screen.getByTestId('venue-meta-datetime-row').querySelector('span')
    expect(datetimePill).toHaveClass('whitespace-nowrap')
  })

  it('uses all courts wording for directory links', () => {
    render(<SplitAvailabilityView />)

    expect(screen.getByRole('link', { name: /explore all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.queryByText(/all venues/i)).not.toBeInTheDocument()
  })

  it('uses all courts wording for the empty-state directory link', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    expect(screen.getByRole('link', { name: /browse all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.getByRole('link', { name: /explore all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.queryByText(/all venues/i)).not.toBeInTheDocument()
  })

  it('includes hybrid open-gym venues in both Open Gym and Private Rentals segments', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [
        mockVenue,
        {
          ...mockHybridOpenGymVenue,
          nextAvailable: {
            slotId: 'slot-hybrid',
            date: '2026-02-10',
            startTime: '16:00:00',
            endTime: '17:00:00',
            displayText: 'Tue Feb 10, 4 PM',
          },
        },
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Gym' }))
    expect(screen.getByText('Memorial Park')).toBeInTheDocument()
    expect(screen.queryByText('Test Venue')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Private Rentals' }))
    expect(screen.getByText('Memorial Park')).toBeInTheDocument()
    expect(screen.getByText('Test Venue')).toBeInTheDocument()
  })

  it('shows open-gym venues without a regular next slot in the Open Gym segment', () => {
    ;(useVenuesWithNextAvailable as jest.Mock).mockReturnValue({
      data: [mockHybridOpenGymVenue],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<SplitAvailabilityView />)

    expect(screen.queryByText('Memorial Park')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Gym' }))
    expect(screen.getByText('Memorial Park')).toBeInTheDocument()
    expect(screen.getByText('$3 drop-in · $50/hr')).toBeInTheDocument()
  })
})
