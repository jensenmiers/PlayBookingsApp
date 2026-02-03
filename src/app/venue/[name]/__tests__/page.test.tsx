import { render, screen } from '@testing-library/react'
import type { Venue } from '@/types'

// Mock next/navigation
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    replace: jest.fn(),
  }),
  notFound: jest.fn(),
}))

// Mock the AvailabilitySlotsList component to avoid its data fetching
jest.mock('@/components/venue/availability-slots-list', () => ({
  AvailabilitySlotsList: ({ venue }: { venue: Venue }) => (
    <div data-testid="availability-slots">Availability for {venue.name}</div>
  ),
}))

// Mock the Navigation component
jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}))

// Import after mocks are set up
import { VenueDetailPage } from '@/components/venue/venue-detail-page'

// Create a complete mock venue for testing
const createMockVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: '123',
  name: 'Test Basketball Court',
  description: 'A great place to play basketball',
  address: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90001',
  owner_id: 'owner-123',
  hourly_rate: 50,
  instant_booking: true,
  insurance_required: false,
  max_advance_booking_days: 30,
  photos: ['https://example.com/photo1.jpg'],
  amenities: ['Parking', 'Restrooms'],
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('VenueDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders venue name, address, and hourly rate', () => {
    const mockVenue = createMockVenue()

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByText('Test Basketball Court')).toBeInTheDocument()
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument()
    expect(screen.getByText('$50')).toBeInTheDocument()
  })

  it('does not show loading spinner when venue is provided', () => {
    const mockVenue = createMockVenue()

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.queryByText('Loading venue details...')).not.toBeInTheDocument()
  })

  it('renders venue description', () => {
    const mockVenue = createMockVenue({
      description: 'A fantastic basketball court with modern facilities',
    })

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByText('A fantastic basketball court with modern facilities')).toBeInTheDocument()
  })

  it('renders amenities', () => {
    const mockVenue = createMockVenue({
      amenities: ['Parking', 'Restrooms', 'Water Fountain'],
    })

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByText('Parking')).toBeInTheDocument()
    expect(screen.getByText('Restrooms')).toBeInTheDocument()
    expect(screen.getByText('Water Fountain')).toBeInTheDocument()
  })

  it('renders AvailabilitySlotsList with venue prop', () => {
    const mockVenue = createMockVenue()

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByTestId('availability-slots')).toBeInTheDocument()
    expect(screen.getByText('Availability for Test Basketball Court')).toBeInTheDocument()
  })

  it('shows instant booking badge when enabled', () => {
    const mockVenue = createMockVenue({ instant_booking: true })

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByText('Instant Booking')).toBeInTheDocument()
  })

  it('shows insurance required badge when enabled', () => {
    const mockVenue = createMockVenue({ insurance_required: true })

    render(<VenueDetailPage venue={mockVenue} />)

    expect(screen.getByText('Insurance Required')).toBeInTheDocument()
  })
})
