import { render, screen } from '@testing-library/react'
import type { Venue } from '@/types'
import { VenueDesignQuickplay } from '@/components/venue/venue-design-quickplay'

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

describe('VenueDesignQuickplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps same-day regular slots available without extra top-of-hour filtering', async () => {
    mockUseVenueAvailabilityRange.mockReturnValue({
      data: [
        {
          date: '2026-02-21',
          start_time: '11:00:00',
          end_time: '12:00:00',
          venue_id: 'venue-1',
          action_type: 'request_private',
        },
      ],
      loading: false,
      error: null,
    })

    render(<VenueDesignQuickplay venue={createMockVenue()} />)

    expect(screen.getByText('11:00AM')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Book 11:00 AM/i })).toBeInTheDocument()
  })
})
