import { render, screen } from '@testing-library/react'
import { VenueCard } from '../venue-card'
import type { Venue } from '@/types'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

jest.mock('@/components/venue/photo-carousel', () => ({
  PhotoCarousel: () => <div data-testid="photo-carousel" />,
}))

function createVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    name: 'Test Court',
    description: 'Indoor basketball court',
    venue_type: 'School Gymnasium',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    owner_id: 'owner-1',
    hourly_rate: 75,
    instant_booking: false,
    insurance_required: false,
    max_advance_booking_days: 30,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    ...overrides,
  }
}

describe('VenueCard', () => {
  it('renders as a link to the venue detail page', () => {
    render(<VenueCard venue={createVenue({ name: 'Downtown Gym' })} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/venue/downtown-gym')
  })

  it('displays venue name, location, and hourly rate', () => {
    render(
      <VenueCard
        venue={createVenue({
          name: 'Test Court',
          city: 'Los Angeles',
          state: 'CA',
          hourly_rate: 75,
        })}
      />
    )

    expect(screen.getByText('Test Court')).toBeInTheDocument()
    expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()
    expect(screen.getByText('$75/hr')).toBeInTheDocument()
  })

  it('shows Instant chip for instant-booking venues', () => {
    render(<VenueCard venue={createVenue({ instant_booking: true })} />)

    expect(screen.getByText('Instant')).toBeInTheDocument()
    expect(screen.queryByText('Host Approval')).not.toBeInTheDocument()
  })

  it('shows Host Approval chip for non-instant venues', () => {
    render(<VenueCard venue={createVenue({ instant_booking: false })} />)

    expect(screen.getByText('Host Approval')).toBeInTheDocument()
    expect(screen.queryByText('Instant')).not.toBeInTheDocument()
  })

  it('shows next available badge when provided', () => {
    render(
      <VenueCard
        venue={createVenue()}
        nextAvailable={{ displayText: 'Today 3:00 PM' }}
      />
    )

    expect(screen.getByText(/Today 3:00 PM/)).toBeInTheDocument()
  })

  it('does not show next available badge when not provided', () => {
    render(<VenueCard venue={createVenue()} />)

    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
  })

  it('renders PhotoCarousel component', () => {
    render(<VenueCard venue={createVenue({ photos: ['/photo1.jpg'] })} />)

    expect(screen.getByTestId('photo-carousel')).toBeInTheDocument()
  })
})
