import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Venue } from '@/types'
import { RequestToBookPage } from '../request-to-book-page'

const mockCreateBooking = jest.fn()
const mockOpenAuthModal = jest.fn()

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt = '' }: { alt?: string }) => <div role="img" aria-label={alt} />,
}))
jest.mock('@/hooks/useBookings', () => ({
  useCreateBooking: () => ({ createBooking: mockCreateBooking, loading: false }),
}))
jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', email: 'user@example.com', phone: '323-555-0111' }, loading: false }),
}))
jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))
jest.mock('@/lib/auth/useAuthResume', () => ({
  useRequestToBookAuthResume: jest.fn(),
}))
jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: jest.fn() }),
}))

const venue = {
  id: 'venue-1',
  name: 'First Presbyterian Church of Hollywood',
  city: 'Los Angeles',
  state: 'CA',
  hourly_rate: 100,
  instant_booking: false,
  booking_mode: 'request_to_book',
  insurance_required: true,
  photos: ['https://example.com/gym.jpg'],
} as unknown as Venue

describe('RequestToBookPage (desktop)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-11-22T20:00:00.000Z'))
    mockCreateBooking.mockResolvedValue({ data: { id: 'booking-1' }, error: null })
  })

  afterEach(() => jest.useRealTimers())

  it('starts from the date and times chosen on the venue page, with the venue and estimate beside the form', () => {
    render(
      <RequestToBookPage
        venue={venue}
        venueSlug="first-presbyterian-church-of-hollywood"
        initial={{ date: '2026-11-28', startTime: '08:00', endTime: '13:00' }}
      />
    )

    expect(screen.getByRole('heading', { name: 'Request to book' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-28')
    expect(screen.getByLabelText('Start time')).toHaveValue('08:00')
    expect(screen.getByLabelText('End time')).toHaveValue('13:00')
    expect(screen.getByText('$500.00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /First Presbyterian Church of Hollywood/ })).toHaveAttribute(
      'href',
      '/venue/first-presbyterian-church-of-hollywood'
    )
  })

  it('ignores a date before the earliest allowed date', () => {
    render(<RequestToBookPage venue={venue} venueSlug="church" initial={{ date: '2020-01-01' }} />)

    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-22')
  })

  it('sends the request and shows the received screen', async () => {
    render(
      <RequestToBookPage
        venue={venue}
        venueSlug="church"
        initial={{ date: '2026-11-28', startTime: '08:00', endTime: '10:00' }}
      />
    )

    fireEvent.change(screen.getByLabelText('What are you planning?'), { target: { value: 'Pickup run' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }))

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({
        date: '2026-11-28',
        start_time: '08:00:00',
        end_time: '10:00:00',
        activity: 'Pickup run',
        phone: '323-555-0111',
      }))
    })
    expect(await screen.findByText("Request sent. You're not booked yet.")).toBeInTheDocument()
  })
})
