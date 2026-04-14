import { fireEvent, render, screen } from '@testing-library/react'
import type { Venue } from '@/types'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'

const mockBack = jest.fn()
const mockUseVenueAvailabilityRange = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: {
    alt?: string
    fill?: boolean
    priority?: boolean
  } & Record<string, unknown>) => {
    const { alt = '', ...rest } = props
    delete rest.fill
    delete rest.priority

    return <div role="img" aria-label={alt} {...rest} />
  },
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenueAvailabilityRange: (...args: any[]) => mockUseVenueAvailabilityRange(...args),
}))

jest.mock('@/components/venue/deferred-slot-booking-confirmation', () => ({
  DeferredSlotBookingConfirmation: () => <div data-testid="slot-booking-dialog" />,
}))

jest.mock('@/components/venue/deferred-calendar', () => ({
  DeferredCalendar: () => <div data-slot="calendar" data-testid="date-picker-calendar" />,
}))

jest.mock('@/components/venue/deferred-venue-location-map', () => ({
  DeferredVenueLocationMap: () => <div data-testid="venue-location-map" />,
}))

jest.mock('@/components/venue/deferred-photo-lightbox', () => ({
  DeferredPhotoLightbox: ({
    venueName,
    currentIndex,
    photos,
    onClose,
    onIndexChange,
  }: {
    venueName: string
    currentIndex: number
    photos: string[]
    onClose: () => void
    onIndexChange: (index: number | null) => void
    }) => (
    <div role="dialog" aria-label={`${venueName} photo viewer`}>
      <button onClick={() => onClose()}>Close</button>
      <button
        onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
      >
        Previous
      </button>
      <button
        onClick={() => onIndexChange(Math.min(photos.length - 1, currentIndex + 1))}
        disabled={currentIndex === photos.length - 1}
      >
        Next
      </button>
      {photos.length > 1 ? `${currentIndex + 1} / ${photos.length}` : null}
    </div>
  ),
}))

const createMockVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'venue-1',
  name: 'Memorial Park',
  description: 'Community court',
  address: '1401 Olympic Blvd',
  city: 'Santa Monica',
  state: 'CA',
  zip_code: '90404',
  owner_id: 'owner-1',
  hourly_rate: 75,
  instant_booking: false,
  insurance_required: false,
  max_advance_booking_days: 30,
  photos: ['https://example.com/photo.jpg'],
  amenities: ['Indoor Court'],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('VenueDesignEditorial photo carousel and lightbox', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders gradient fallback when venue has no photos', () => {
    render(<VenueDesignEditorial venue={createMockVenue({ photos: [] })} />)

    const fallback = document.querySelector('.bg-gradient-to-br')
    expect(fallback).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('[data-testid="carousel-dots"]')).not.toBeInTheDocument()
  })

  it('renders single photo as hero with no dots or scroll', () => {
    render(
      <VenueDesignEditorial
        venue={createMockVenue({ photos: ['https://example.com/hero.jpg'] })}
      />
    )

    expect(screen.getByRole('img', { name: 'Memorial Park' })).toBeInTheDocument()
    expect(document.querySelector('[data-testid="carousel-dots"]')).not.toBeInTheDocument()
  })

  it('opens the lightbox for single-photo venues', () => {
    render(
      <VenueDesignEditorial
        venue={createMockVenue({ photos: ['https://example.com/hero.jpg'] })}
      />
    )

    fireEvent.click(screen.getByRole('img', { name: 'Memorial Park' }))

    expect(screen.getByRole('dialog', { name: 'Memorial Park photo viewer' })).toBeInTheDocument()
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
  })

  it('renders all photos in a scrollable carousel with dot indicators', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    const images = screen.getAllByRole('img', { name: /Memorial Park/ })
    expect(images.length).toBe(3)

    const dots = document.querySelector('[data-testid="carousel-dots"]')
    expect(dots).toBeInTheDocument()
    expect(dots?.children).toHaveLength(3)
  })

  it('has first dot active by default', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    const dots = document.querySelector('[data-testid="carousel-dots"]')
    expect(dots?.children[0]).toHaveAttribute('data-active', 'true')
    expect(dots?.children[1]).toHaveAttribute('data-active', 'false')
  })

  it('opens lightbox at tapped photo index', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    const images = screen.getAllByRole('img', { name: /Memorial Park/ })
    fireEvent.click(images[1])

    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('closes lightbox when close button is clicked', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    const images = screen.getAllByRole('img', { name: /Memorial Park/ })
    fireEvent.click(images[0])
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument()
  })

  it('navigates between photos in lightbox', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    const images = screen.getAllByRole('img', { name: /Memorial Park/ })
    fireEvent.click(images[0])
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    const prevButton = screen.getByRole('button', { name: /previous/i })
    fireEvent.click(prevButton)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('does not emit Radix accessibility warnings when the lightbox opens', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <VenueDesignEditorial
        venue={createMockVenue({ photos: ['https://example.com/1.jpg', 'https://example.com/2.jpg'] })}
      />
    )

    fireEvent.click(screen.getAllByRole('img', { name: /Memorial Park/ })[0])

    const errorMessages = errorSpy.mock.calls.map(([message]) => String(message))
    const warnMessages = warnSpy.mock.calls.map(([message]) => String(message))

    expect(errorMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining('DialogTitle')])
    )
    expect(warnMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Missing `Description`')])
    )

    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('does not render the old static gallery grid', () => {
    const photos = [
      'https://example.com/1.jpg',
      'https://example.com/2.jpg',
      'https://example.com/3.jpg',
    ]
    render(<VenueDesignEditorial venue={createMockVenue({ photos })} />)

    expect(screen.queryByRole('heading', { name: 'Gallery' })).not.toBeInTheDocument()
  })
})

describe('VenueDesignEditorial coming-up pills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders server-provided initial availability without the loading skeleton', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-21', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(
      <VenueDesignEditorial
        venue={createMockVenue()}
        initialAvailability={[
          {
            date: '2026-02-21',
            start_time: '12:00:00',
            end_time: '13:00:00',
            venue_id: 'venue-1',
            action_type: 'request_private',
          },
        ]}
      />
    )

    expect(screen.getByText(/Today\s*·\s*12:00 PM - 1:00 PM/)).toBeInTheDocument()
    expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument()
    expect(mockUseVenueAvailabilityRange).toHaveBeenCalledWith(
      'venue-1',
      '2026-02-21',
      '2026-02-27',
      expect.objectContaining({
        initialData: [
          expect.objectContaining({
            date: '2026-02-21',
            start_time: '12:00:00',
          }),
        ],
      })
    )
  })

  it('shows 7 day pills and a More dates button; clicking More dates shows calendar', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-23', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
        { date: '2026-02-24', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    // Exactly 7 day pills
    expect(screen.getAllByRole('button', { name: /coming-up-day/i })).toHaveLength(7)

    // More dates buttons exist (mobile + desktop variants)
    const moreDatesButtons = screen.getAllByRole('button', { name: /more dates/i })
    expect(moreDatesButtons.length).toBeGreaterThanOrEqual(1)

    // Click opens a calendar
    fireEvent.click(moreDatesButtons[0])
    expect(document.querySelector('[data-slot="calendar"]')).toBeInTheDocument()

    // Still 7 pills (no expansion to 14)
    expect(screen.getAllByRole('button', { name: /coming-up-day/i })).toHaveLength(7)
  })

  it('renders zero-slot days as disabled pills', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-23', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getByRole('button', { name: 'coming-up-day-2026-02-22' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'coming-up-day-2026-02-23' })).toBeEnabled()
  })

  it('keeps an exact top-of-hour slot bookable for today', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-21', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getByText(/Today\s*·\s*12:00 PM - 1:00 PM/)).toBeInTheDocument()
  })

  it('does not apply an extra client-side top-of-hour cutoff to same-day slots', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-21', start_time: '11:00:00', end_time: '12:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getByText(/Today\s*·\s*11:00 AM - 12:00 PM/)).toBeInTheDocument()
  })

  it('shows Host Approval with a clock icon for request slots', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-21', start_time: '12:00:00', end_time: '13:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    const { container } = render(<VenueDesignEditorial venue={createMockVenue({ instant_booking: false })} />)

    const approvalLabel = screen.getByText('Host Approval')
    const approvalContainer = approvalLabel.parentElement

    expect(approvalContainer).not.toBeNull()
    expect(approvalContainer?.querySelector('[data-icon="clock"]')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="bolt"]')).not.toBeInTheDocument()
  })

  it('shows drop-in person pricing for info-only slots instead of venue hourly rate', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        {
          date: '2026-02-21',
          start_time: '12:00:00',
          end_time: '13:00:00',
          venue_id: 'venue-1',
          action_type: 'info_only_open_gym',
          slot_pricing: {
            amount_cents: 500,
            currency: 'USD',
            unit: 'person',
            payment_method: 'on_site',
          },
        },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getByText('$5/person')).toBeInTheDocument()
    expect(screen.getByText('Pay on site')).toBeInTheDocument()
    expect(screen.queryByText('$75/hr')).not.toBeInTheDocument()
  })

  it('renders a venue map section near the bottom of the page', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByTestId('venue-location-map')).toBeInTheDocument()
  })
})
