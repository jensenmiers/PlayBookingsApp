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
  default: ({ alt = '' }: { alt?: string }) => <div role="img" aria-label={alt} />,
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenueAvailabilityRange: (...args: any[]) => mockUseVenueAvailabilityRange(...args),
}))

jest.mock('@/components/booking/slot-booking-confirmation', () => ({
  SlotBookingConfirmation: () => <div data-testid="slot-booking-dialog" />,
}))

jest.mock('@/components/ui/calendar', () => ({
  Calendar: (props: any) => <div data-slot="calendar" data-testid="date-picker-calendar" />,
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

describe('VenueDesignEditorial coming-up pills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
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
})
