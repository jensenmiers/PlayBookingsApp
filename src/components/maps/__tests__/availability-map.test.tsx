import { fireEvent, render, screen } from '@testing-library/react'
import { AvailabilityMap } from '../availability-map'

jest.mock('react-map-gl/mapbox', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-map">{children}</div>,
  Marker: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: (evt: { originalEvent: { stopPropagation: () => void } }) => void
  }) => (
    <button
      type="button"
      data-testid="mock-marker"
      onClick={() => onClick?.({ originalEvent: { stopPropagation: jest.fn() } })}
    >
      {children}
    </button>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-popup">{children}</div>,
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
  distanceMiles: null,
  nextAvailable: {
    slotId: 'slot-1',
    date: '2026-02-20',
    startTime: '18:00:00',
    endTime: '19:00:00',
    displayText: 'Tomorrow 6:00 PM',
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
})
