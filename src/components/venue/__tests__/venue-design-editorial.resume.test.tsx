import { render, screen, waitFor } from '@testing-library/react'
import type { Venue } from '@/types'
import { VenueDesignEditorial } from '@/components/venue/venue-design-editorial'

const mockUseVenueAvailabilityRange = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '' }: { alt?: string }) => <div role="img" aria-label={alt} />,
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenueAvailabilityRange: (...args: unknown[]) => mockUseVenueAvailabilityRange(...args),
}))

jest.mock('@/components/booking/slot-booking-confirmation', () => ({
  SlotBookingConfirmation: ({
    date,
    startTime,
  }: {
    date: string
    startTime: string
  }) => <div data-testid="slot-booking-dialog">{date}:{startTime}</div>,
}))

jest.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="date-picker-calendar" />,
}))

jest.mock('@/components/maps/venue-location-map', () => ({
  VenueLocationMap: () => <div data-testid="venue-location-map" />,
}))

const venue: Venue = {
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
}

describe('VenueDesignEditorial auth resume', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-21T20:00:00.000Z'))
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/venue/memorial-park')
    mockUseVenueAvailabilityRange.mockImplementation((_venueId, dateFrom, dateTo) => {
      if (dateFrom === '2026-02-21' && dateTo === '2026-02-27') {
        return {
          data: [
            {
              date: '2026-02-23',
              start_time: '12:00:00',
              end_time: '13:00:00',
              venue_id: 'venue-1',
              action_type: 'request_private',
              slot_instance_id: 'slot-123',
              modal_content: null,
            },
          ],
          loading: false,
          error: null,
        }
      }

      return {
        data: [],
        loading: false,
        error: null,
      }
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reopens the stored slot booking after auth return', async () => {
    window.sessionStorage.setItem(
      'play-bookings-auth-resume',
      JSON.stringify({
        returnTo: '/venue/memorial-park',
        resumeState: {
          type: 'slot-booking',
          venueId: 'venue-1',
          date: '2026-02-23',
          startTime: '12:00:00',
          endTime: '13:00:00',
          slotActionType: 'request_private',
          slotInstanceId: 'slot-123',
          slotModalContent: null,
        },
      })
    )

    render(<VenueDesignEditorial venue={venue} />)

    await waitFor(() => {
      expect(screen.getByTestId('slot-booking-dialog')).toHaveTextContent('2026-02-23:12:00:00')
    })
  })

  it('reopens a stored slot booking selected from the out-of-range date picker', async () => {
    window.sessionStorage.setItem(
      'play-bookings-auth-resume',
      JSON.stringify({
        returnTo: '/venue/memorial-park',
        resumeState: {
          type: 'slot-booking',
          venueId: 'venue-1',
          date: '2026-02-28',
          startTime: '18:00:00',
          endTime: '19:00:00',
          slotActionType: 'request_private',
          slotInstanceId: 'slot-456',
          slotModalContent: null,
        },
      })
    )

    mockUseVenueAvailabilityRange.mockImplementation((_venueId, dateFrom, dateTo) => {
      if (dateFrom === '2026-02-21' && dateTo === '2026-02-27') {
        return {
          data: [
            {
              date: '2026-02-23',
              start_time: '12:00:00',
              end_time: '13:00:00',
              venue_id: 'venue-1',
              action_type: 'request_private',
              slot_instance_id: 'slot-123',
              modal_content: null,
            },
          ],
          loading: false,
          error: null,
        }
      }

      if (dateFrom === '2026-02-28' && dateTo === '2026-02-28') {
        return {
          data: [
            {
              date: '2026-02-28',
              start_time: '18:00:00',
              end_time: '19:00:00',
              venue_id: 'venue-1',
              action_type: 'request_private',
              slot_instance_id: 'slot-456',
              modal_content: null,
            },
          ],
          loading: false,
          error: null,
        }
      }

      return {
        data: [],
        loading: false,
        error: null,
      }
    })

    render(<VenueDesignEditorial venue={venue} />)

    await waitFor(() => {
      expect(screen.getByTestId('slot-booking-dialog')).toHaveTextContent('2026-02-28:18:00:00')
    })
    expect(window.sessionStorage.getItem('play-bookings-auth-resume')).toBeNull()
  })
})
