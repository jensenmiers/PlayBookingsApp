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

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div aria-label={alt} />,
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
  it('shows Insurance chip when venue requires insurance', () => {
    render(<VenueCard venue={createVenue({ insurance_required: true })} />)

    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })

  it('does not show Insurance chip when venue does not require insurance', () => {
    render(<VenueCard venue={createVenue({ insurance_required: false })} />)

    expect(screen.queryByText('Insurance')).not.toBeInTheDocument()
  })
})
