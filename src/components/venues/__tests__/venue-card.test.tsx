import { fireEvent, render, screen } from '@testing-library/react'
import { VenueCard } from '../venue-card'
import type { Venue, VenueMedia } from '@/types'

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
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean
      priority?: boolean
      sizes?: string
    }
  ) => {
    const { alt, onClick } = props

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} onClick={onClick} />
    )
  },
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

function createMedia(overrides: Partial<VenueMedia> = {}): VenueMedia {
  return {
    id: 'media-1',
    venue_id: 'venue-1',
    media_type: 'image',
    storage_provider: 'supabase',
    bucket_name: 'venue-photos',
    object_path: 'test-court/hero.webp',
    public_url: 'https://example.com/hero.webp',
    alt_text: null,
    caption: null,
    sort_order: 0,
    is_primary: true,
    mime_type: 'image/webp',
    file_size_bytes: null,
    width_px: null,
    height_px: null,
    migrated_from_legacy_photos: true,
    created_by: null,
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
        nextAvailable={{ displayText: 'Fri 3:00 PM' }}
      />
    )

    expect(screen.getByText(/Fri 3:00 PM/)).toBeInTheDocument()
  })

  it('does not show next available badge when not provided', () => {
    render(<VenueCard venue={createVenue()} />)

    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument()
  })

  it('renders PhotoCarousel component', () => {
    render(<VenueCard venue={createVenue({ photos: ['/photo1.jpg'] })} />)

    expect(screen.getByRole('img', { name: 'Test Court' })).toBeInTheDocument()
  })

  it('prefers ordered venue media over stale legacy photos', () => {
    render(
      <VenueCard
        venue={createVenue({
          photos: ['/legacy-photo.jpg'],
          media: [
            createMedia({
              id: 'media-2',
              sort_order: 1,
              is_primary: false,
              public_url: '/detail-photo.jpg',
            }),
            createMedia({
              id: 'media-1',
              sort_order: 0,
              is_primary: true,
              public_url: '/hero-photo.jpg',
            }),
          ],
        })}
      />
    )

    expect(screen.getByRole('img', { name: 'Test Court photo 1' })).toBeInTheDocument()
  })

  it('allows photo clicks to bubble to the wrapping venue link', () => {
    render(
      <VenueCard
        venue={createVenue({
          photos: ['/photo1.jpg', '/photo2.jpg'],
        })}
      />
    )

    const link = screen.getByRole('link')
    const linkClickHandler = jest.fn()
    link.addEventListener('click', linkClickHandler)

    const photo = screen.getAllByTestId('carousel-photo')[0]
    fireEvent.click(photo)

    expect(linkClickHandler).toHaveBeenCalledTimes(1)
  })
})
