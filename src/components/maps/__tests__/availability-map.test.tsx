import { fireEvent, render, screen } from '@testing-library/react'
import { AvailabilityMap } from '../availability-map'

jest.mock('react-map-gl/mapbox', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
  Marker: ({
    children,
    onClick,
    style,
  }: {
    children: React.ReactNode
    onClick?: (evt: { originalEvent: { stopPropagation: () => void } }) => void
    style?: React.CSSProperties
  }) => (
    <button
      type="button"
      data-testid="mock-marker"
      style={style}
      onClick={() => onClick?.({ originalEvent: { stopPropagation: jest.fn() } })}
    >
      {children}
    </button>
  ),
  Popup: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <div data-testid="mock-popup" className={className}>{children}</div>,
  NavigationControl: () => <div data-testid="mock-nav-control" />,
}))

const mockVenue = {
  id: 'venue-1',
  name: 'Crosscourt',
  city: 'Los Angeles',
  state: 'CA',
  address: '123 Main St',
  latitude: 34.0522,
  longitude: -118.2437,
  hourlyRate: 120,
  instantBooking: true,
  insuranceRequired: false,
  distanceMiles: null,
  nextAvailable: {
    slotId: 'slot-1',
    date: '2026-02-20',
    startTime: '18:00:00',
    endTime: '19:00:00',
    displayText: 'Fri Feb 20, 6 PM',
  },
}

const mockUnavailableVenue = {
  ...mockVenue,
  id: 'venue-2',
  name: 'No Slots Court',
  nextAvailable: null,
}

const mockVenueTwo = {
  ...mockVenue,
  id: 'venue-3',
  name: 'Evening Hoops',
  nextAvailable: {
    slotId: 'slot-2',
    date: '2026-02-20',
    startTime: '20:00:00',
    endTime: '21:00:00',
    displayText: 'Fri Feb 20, 8 PM',
  },
}

describe('AvailabilityMap popup readability', () => {
  const originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token'
  })

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      return
    }
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken
  })

  it('uses dark text classes in the popup content for contrast on light popup surfaces', () => {
    render(<AvailabilityMap venues={[mockVenue]} />)

    fireEvent.click(screen.getByTestId('mock-marker'))

    expect(screen.getByRole('heading', { name: /crosscourt/i })).toHaveClass('text-secondary-900')
    expect(screen.getByText('Los Angeles, CA')).toHaveClass('text-secondary-600')
  })

  it('applies the shared map popup class hook for global close-button styling', () => {
    render(<AvailabilityMap venues={[mockVenue]} />)

    fireEvent.click(screen.getByTestId('mock-marker'))

    expect(screen.getByTestId('mock-popup')).toHaveClass('map-popup')
  })

  it('renders available markers above unavailable markers on initial load', () => {
    render(<AvailabilityMap venues={[mockUnavailableVenue, mockVenue]} />)

    const availableBadge = screen.getByText('Fri Feb 20, 6 PM')
    const availableMarker = availableBadge.closest('[data-testid="mock-marker"]')
    const unavailableMarker = screen.getAllByTestId('mock-marker').find((marker) => marker !== availableMarker)

    expect(availableMarker).not.toBeNull()
    expect(unavailableMarker).toBeDefined()
    expect(availableMarker).toHaveStyle({ zIndex: 2 })
    expect(unavailableMarker).toHaveStyle({ zIndex: 1 })
  })

  it('renders selected unavailable marker above unselected available marker', () => {
    render(
      <AvailabilityMap
        venues={[mockUnavailableVenue, mockVenue]}
        selectedVenueId={mockUnavailableVenue.id}
      />
    )

    const [selectedUnavailableMarker, unselectedAvailableMarker] = screen.getAllByTestId('mock-marker')

    expect(selectedUnavailableMarker).toHaveStyle({ zIndex: 3 })
    expect(unselectedAvailableMarker).toHaveStyle({ zIndex: 2 })
  })

  it('renders selected available marker above unselected available marker', () => {
    render(
      <AvailabilityMap
        venues={[mockVenue, mockVenueTwo]}
        selectedVenueId={mockVenueTwo.id}
      />
    )

    const selectedAvailableMarker = screen
      .getByText('Fri Feb 20, 8 PM')
      .closest('[data-testid="mock-marker"]')
    const unselectedAvailableMarker = screen
      .getByText('Fri Feb 20, 6 PM')
      .closest('[data-testid="mock-marker"]')

    expect(selectedAvailableMarker).not.toBeNull()
    expect(unselectedAvailableMarker).not.toBeNull()
    expect(selectedAvailableMarker).toHaveStyle({ zIndex: 3 })
    expect(unselectedAvailableMarker).toHaveStyle({ zIndex: 2 })
  })
})
