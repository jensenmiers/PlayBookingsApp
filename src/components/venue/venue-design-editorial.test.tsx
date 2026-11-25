import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Venue } from '@/types'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'

const mockBack = jest.fn()
const mockUseVenueAvailabilityRange = jest.fn()
const mockCreateBooking = jest.fn()
const mockOpenAuthModal = jest.fn()
let mockCurrentUser: { id: string; email: string; phone?: string } | null = {
  id: 'user-1',
  email: 'user@example.com',
}

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  usePathname: () => '/venue/memorial-park',
}))

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <nav data-testid="site-header" />,
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

jest.mock('@/hooks/useBookings', () => ({
  useCreateBooking: () => ({
    createBooking: mockCreateBooking,
    loading: false,
  }),
}))

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mockCurrentUser,
    loading: false,
  }),
}))

jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({
    openAuthModal: mockOpenAuthModal,
  }),
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
    mockCurrentUser = {
      id: 'user-1',
      email: 'user@example.com',
    }
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })
    mockCreateBooking.mockResolvedValue({ data: { id: 'booking-1' }, error: null })
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

  it('opens the lightbox from the shared photo pill button', () => {
    render(
      <VenueDesignEditorial
        venue={createMockVenue({ photos: ['https://example.com/hero.jpg'] })}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /view all 1 venue photo/i }))

    expect(screen.getByRole('dialog', { name: 'Memorial Park photo viewer' })).toBeInTheDocument()
  })

  it('shows compact photo count text in the shared photo pill button', () => {
    render(
      <VenueDesignEditorial
        venue={createMockVenue({
          photos: ['https://example.com/hero.jpg', 'https://example.com/detail.jpg'],
        })}
      />
    )

    expect(screen.getByRole('button', { name: /view all 2 venue photos/i })).toBeInTheDocument()
    expect(screen.getByText('2 photos')).toBeInTheDocument()
  })

  it('keeps the booking mode chip out of the hero meta row', () => {
    render(<VenueDesignEditorial venue={createMockVenue({ instant_booking: false })} />)

    const city = screen.getByText('Santa Monica, CA')
    expect(city.parentElement).not.toHaveTextContent('Host Approval')
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

    const nextButton = within(screen.getByRole('dialog')).getByRole('button', { name: /next/i })
    fireEvent.click(nextButton)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    const prevButton = within(screen.getByRole('dialog')).getByRole('button', { name: /previous/i })
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

describe('VenueDesignEditorial availability calendar', () => {
  it('does not describe a failed availability load as an empty week', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({ data: null, loading: false, error: 'Network error' })
    render(<VenueDesignEditorial venue={createMockVenue()} />)
    expect(within(screen.getByTestId('venue-booking-card')).getByText('Availability could not be loaded')).toBeInTheDocument()
    expect(screen.queryByText('No availability this week')).not.toBeInTheDocument()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
    mockCreateBooking.mockResolvedValue({ data: { id: 'booking-1' }, error: null })
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

    expect(screen.getByText(/Today Feb 21\s*·\s*12:00 PM - 1:00 PM/)).toBeInTheDocument()
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

  it('renders seven days and loads the next week when navigating', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({ data: [], loading: false, error: null })
    render(<VenueDesignEditorial venue={createMockVenue()} />)
    expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /View .*February/ })).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Next seven days' }))
    expect(mockUseVenueAvailabilityRange).toHaveBeenCalledWith('venue-1', '2026-02-28', '2026-03-06', expect.any(Object))
  })

  it('allows viewing an empty day on mobile', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({ data: [], loading: false, error: null })
    render(<VenueDesignEditorial venue={createMockVenue()} />)
    const day = screen.getByRole('button', { name: 'View Sunday, February 22' })
    expect(day).toBeEnabled()
    fireEvent.click(day)
    expect(day).toHaveAttribute('aria-pressed', 'true')
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

    expect(screen.getByText(/Today Feb 21\s*·\s*12:00 PM - 1:00 PM/)).toBeInTheDocument()
  })

  it('removes stale slots that have already started', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        { date: '2026-02-21', start_time: '11:00:00', end_time: '12:00:00', venue_id: 'venue-1', action_type: 'request_private' },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.queryByText(/Today Feb 21\s*·\s*11:00 AM - 12:00 PM/)).not.toBeInTheDocument()
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

    const approvalLabels = screen.getAllByText('Host Approval')
    const approvalContainer = approvalLabels.find((label) =>
      Boolean(label.parentElement?.querySelector('[data-icon="clock"]'))
    )?.parentElement

    expect(approvalContainer).not.toBeNull()
    expect(approvalContainer?.querySelector('[data-icon="clock"]')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="bolt"]')).not.toBeInTheDocument()
  })

  it('shows Host Approval in the booking card when no slots are available', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue({ instant_booking: false })} />)

    const bookingCard = screen.getByTestId('venue-booking-card')
    expect(within(bookingCard).getByText('Host Approval')).toBeInTheDocument()
    expect(within(bookingCard).getByText('No availability this week')).toBeInTheDocument()
  })

  const renderRequestVenue = (venueAdminConfig?: Parameters<typeof VenueDesignEditorial>[0]['venueAdminConfig']) => {
    mockUseVenueAvailabilityRange.mockReturnValue({ data: [], loading: false, error: null })
    return render(
      <VenueDesignEditorial
        venue={createMockVenue({
          instant_booking: false,
          booking_mode: 'request_to_book',
        })}
        venueAdminConfig={venueAdminConfig}
      />
    )
  }

  const fillTimes = () => {
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '19:00' } })
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '21:00' } })
  }

  const openSheet = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Request a time' }))
    return screen.findByRole('dialog')
  }

  const fillDetails = (sheet: HTMLElement) => {
    fireEvent.change(within(sheet).getByLabelText('What are you planning?'), { target: { value: 'Team practice' } })
    fireEvent.change(within(sheet).getByLabelText('Message to host (optional)'), {
      target: { value: 'Youth basketball practice' },
    })
  }

  const setDesktop = (isDesktop: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: isDesktop ? () => ({ matches: true }) : undefined,
    })
  }

  afterEach(() => setDesktop(false))

  it('shows the site header on the venue page', () => {
    renderRequestVenue()

    expect(screen.getByTestId('site-header')).toBeInTheDocument()
  })

  it('replaces slot availability with a compact request card for request-to-book venues', () => {
    renderRequestVenue()

    expect(screen.getByText('Request your preferred time')).toBeInTheDocument()
    expect(screen.getByText('Request a time to book')).toBeInTheDocument()
    expect(screen.getByText('No published availability shown')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Start time')).toBeInTheDocument()
    expect(screen.getByLabelText('End time')).toBeInTheDocument()
    expect(screen.getByText(/No payment now/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request a time' })).toBeInTheDocument()
    // The rest of the form waits for the sheet (phone) or the request page (desktop).
    expect(screen.queryByLabelText('What are you planning?')).not.toBeInTheDocument()
    expect(screen.queryByText('No availability this week')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Coming Up' })).not.toBeInTheDocument()
  })

  it('puts start and end time on one row, with every control constrained to the card', () => {
    renderRequestVenue()

    const timeRow = screen.getByTestId('request-time-row')
    expect(timeRow.className).toContain('grid-cols-[repeat(2,minmax(0,1fr))]')
    expect(within(timeRow).getByLabelText('Start time')).toBeInTheDocument()
    expect(within(timeRow).getByLabelText('End time')).toBeInTheDocument()
    for (const label of ['Date', 'Start time', 'End time']) {
      const control = screen.getByLabelText(label)
      expect(control.parentElement).toHaveClass('relative', 'w-full', 'min-w-0', 'max-w-full', 'overflow-hidden', 'rounded-lg')
      expect(control).toHaveClass('block', 'w-full', 'min-w-0', 'max-w-full', 'appearance-none', 'overflow-hidden')
    }
  })

  it('updates the estimate as times change', () => {
    renderRequestVenue()

    expect(screen.getByText('$75.00')).toBeInTheDocument()
    fillTimes()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
  })

  it('on desktop, goes to the request page with the chosen date and times', () => {
    setDesktop(true)
    renderRequestVenue()

    fillTimes()
    fireEvent.click(screen.getByRole('button', { name: 'Request a time' }))

    expect(mockPush).toHaveBeenCalledWith('/venue/memorial-park/request?date=2026-02-21&start=19%3A00&end=21%3A00')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('on phones, finishes in a bottom sheet and shows the received screen', async () => {
    renderRequestVenue()

    fillTimes()
    const sheet = await openSheet()
    expect(within(sheet).getByText('Request to book')).toBeInTheDocument()
    fillDetails(sheet)
    fireEvent.change(within(sheet).getByLabelText('Phone'), { target: { value: '323-555-0100' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith({
        venue_id: 'venue-1',
        date: '2026-02-21',
        start_time: '19:00:00',
        end_time: '21:00:00',
        recurring_type: 'none',
        activity: 'Team practice',
        phone: '323-555-0100',
        notes: 'Youth basketball practice',
      })
    })
    expect(await screen.findByText("Request sent. You're not booked yet.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my requests' })).toHaveAttribute('href', '/my-bookings')
  })

  it('prefills the phone saved on the profile', async () => {
    mockCurrentUser = { id: 'user-1', email: 'user@example.com', phone: '323-555-0111' }
    renderRequestVenue()

    const sheet = await openSheet()
    expect(within(sheet).getByLabelText('Phone')).toHaveValue('323-555-0111')
    fillDetails(sheet)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ phone: '323-555-0111' }))
    })
  })

  it('asks for a phone number and what they are planning before sending', async () => {
    mockCurrentUser = { id: 'user-1', email: 'user@example.com' }
    renderRequestVenue()

    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))
    expect(await within(sheet).findByText('Choose what you are planning')).toBeInTheDocument()

    fillDetails(sheet)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))
    expect(await within(sheet).findByText('Add a phone number so the venue can reach you')).toBeInTheDocument()
    expect(mockCreateBooking).not.toHaveBeenCalled()
  })

  it('takes typed plans when Other is chosen', async () => {
    renderRequestVenue()

    const sheet = await openSheet()
    fireEvent.change(within(sheet).getByLabelText('What are you planning?'), { target: { value: 'Other' } })
    fireEvent.change(within(sheet).getByLabelText('Describe your plans'), { target: { value: 'Volleyball practice' } })
    fireEvent.change(within(sheet).getByLabelText('Phone'), { target: { value: '323-555-0100' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({ activity: 'Volleyball practice' }))
    })
  })

  it('fills the date and times from a usually-open hint', () => {
    renderRequestVenue({
      request_hint_windows: [{ day_of_week: 6, start_time: '08:00:00', end_time: '13:00:00' }],
    })

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-24' } })
    fireEvent.click(screen.getByRole('button', { name: /Sat 8:00 AM–1:00 PM/ }))

    expect(screen.getByLabelText('Date')).toHaveValue('2026-02-28')
    expect(screen.getByLabelText('Start time')).toHaveValue('08:00')
    expect(screen.getByLabelText('End time')).toHaveValue('13:00')
    expect(screen.getByText('$375.00')).toBeInTheDocument()
  })

  it('only offers times inside the venue hours, and blocks Request a time on a closed day', () => {
    renderRequestVenue({
      operating_hours: [{ day_of_week: 6, start_time: '08:00:00', end_time: '12:00:00' }],
    })

    const startValues = Array.from((screen.getByLabelText('Start time') as HTMLSelectElement).options)
      .map((option) => option.value)
      .filter((value) => value !== '18:00')
    expect(startValues).toEqual(['08:00', '09:00', '10:00', '11:00'])

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-02-23' } })
    expect(screen.getByText("The venue isn't open on this day. Try another date.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Request a time' }))
    expect(screen.getByText('Choose a start time when the venue is open')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens sign-in with request details when a signed-out user sends a request', async () => {
    mockCurrentUser = null
    renderRequestVenue()

    fillTimes()
    const sheet = await openSheet()
    expect(within(sheet).queryByLabelText('Phone')).not.toBeInTheDocument()
    fillDetails(sheet)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(mockOpenAuthModal).toHaveBeenCalledWith({
        entryMode: 'login',
        contextMessage: 'Sign in to send your request',
        resumeState: {
          type: 'request-to-book',
          venueId: 'venue-1',
          date: '2026-02-21',
          startTime: '19:00',
          endTime: '21:00',
          activity: 'Team practice',
          notes: 'Youth basketball practice',
          phone: '',
        },
      })
    })
    expect(mockCreateBooking).not.toHaveBeenCalled()
  })

  it('clears an earlier form error once the request is valid', async () => {
    mockCurrentUser = null
    renderRequestVenue()

    const sheet = await openSheet()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))
    expect(await within(sheet).findByText('Choose what you are planning')).toBeInTheDocument()

    fillDetails(sheet)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Send request' }))

    await waitFor(() => expect(mockOpenAuthModal).toHaveBeenCalled())
    expect(within(sheet).queryByText('Choose what you are planning')).not.toBeInTheDocument()
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
            amount_cents: 300,
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

    expect(screen.getByText('$3/person')).toBeInTheDocument()
    expect(screen.getByText('Pay on site')).toBeInTheDocument()
    const bookingCard = screen.getByTestId('venue-booking-card')
    expect(within(bookingCard).queryByText('$75/hr')).not.toBeInTheDocument()
  })

  it('ignores instance pricing for private rental slots', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        {
          date: '2026-02-21',
          start_time: '12:00:00',
          end_time: '13:00:00',
          venue_id: 'venue-1',
          action_type: 'instant_book',
          slot_pricing: {
            amount_cents: 12500,
            currency: 'USD',
            unit: 'hour',
            payment_method: 'in_app',
          },
        },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignEditorial venue={createMockVenue()} />)

    expect(screen.getAllByText('$75/hr').length).toBeGreaterThan(0)
    expect(screen.queryByText('$125/hr')).not.toBeInTheDocument()
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

  it('summarizes renter decision details before the long-form venue content', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })

    render(
      <VenueDesignEditorial
        venue={createMockVenue({
          booking_mode: 'approval_slots',
          insurance_required: true,
          max_advance_booking_days: 45,
        })}
      />
    )

    expect(screen.getByRole('heading', { name: 'Good to know' })).toBeInTheDocument()
    expect(screen.getByText('$75/hr')).toBeInTheDocument()
    expect(screen.getByText('Standard hourly rate')).toBeInTheDocument()
    expect(screen.queryByText(/weekdays|weekends/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Host Approval').length).toBeGreaterThan(0)
    expect(screen.getByText('Book future dates')).toBeInTheDocument()
    expect(screen.getByText('Availability updates by date')).toBeInTheDocument()
    expect(screen.getAllByText('Insurance Required').length).toBeGreaterThan(0)
    expect(screen.getByText('Certificate of insurance required before confirmation')).toBeInTheDocument()
  })

  it('communicates minimum request lead time instead of max advance booking in planning facts', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })

    render(
      <VenueDesignEditorial
        venue={createMockVenue({
          booking_mode: 'request_to_book',
          max_advance_booking_days: 30,
        })}
        venueAdminConfig={{
          min_advance_booking_days: 0,
          min_advance_lead_time_hours: 24,
        }}
      />
    )

    expect(screen.getByText('Request at least 24 hours ahead')).toBeInTheDocument()
    expect(screen.getByText('Minimum notice before start time')).toBeInTheDocument()
    expect(screen.queryByText('Book up to 30 days ahead')).not.toBeInTheDocument()
  })

  it('defaults request-to-book dates to the minimum advance date when configured', () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [],
      loading: false,
      error: null,
    })

    render(
      <VenueDesignEditorial
        venue={createMockVenue({
          booking_mode: 'request_to_book',
        })}
        venueAdminConfig={{
          min_advance_booking_days: 2,
          min_advance_lead_time_hours: 0,
        }}
      />
    )

    const dateInput = screen.getByLabelText('Date') as HTMLInputElement
    expect(dateInput).toHaveAttribute('min', '2026-02-23')
    expect(dateInput).toHaveValue('2026-02-23')
  })
})
