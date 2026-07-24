import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import VenuesPage from '../page'

const mockPush = jest.fn()
const mockFetch = jest.fn()
const mockRpc = jest.fn()
let mockSearchParams = ''

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(mockSearchParams),
}))

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <nav>Navigation</nav>,
}))

jest.mock('@/components/layout/public-site-footer', () => ({
  PublicSiteFooter: () => <footer>Footer</footer>,
}))

jest.mock('@/components/venues/venue-card', () => ({
  VenueCard: ({
    venue,
    nextAvailable,
  }: {
    venue: { id: string; name: string }
    nextAvailable?: { displayText: string } | null
  }) => (
    <a href={`/venue/${venue.id}`}>
      {venue.name}
      {nextAvailable ? ` ${nextAvailable.displayText}` : ''}
    </a>
  ),
}))

jest.mock('@/components/venues/venue-card-grid-skeleton', () => ({
  VenueCardGridSkeleton: () => <div data-testid="venue-card-skeleton" />,
}))

jest.mock('@/components/ui/error-message', () => ({
  ErrorMessage: ({ error }: { error: string }) => <div>{error}</div>,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

function createMockResponse(body: unknown, options: { status?: number } = {}) {
  const status = options.status ?? 200

  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

function createVenue(id: string, name: string) {
  return {
    id,
    name,
    city: 'Los Angeles',
    state: 'CA',
    hourly_rate: 100,
    instant_booking: true,
    booking_mode: 'instant_slots',
  }
}

function createVenueResponse(venues: ReturnType<typeof createVenue>[]) {
  return createMockResponse({
    success: true,
    data: venues,
    pagination: {
      page: 1,
      limit: 12,
      total: venues.length,
      total_pages: 1,
    },
  })
}

describe('VenuesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    mockSearchParams = ''
    global.fetch = mockFetch as unknown as typeof fetch
    mockRpc.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('labels the directory as all courts', async () => {
    mockFetch.mockResolvedValue(createVenueResponse([]))

    render(<VenuesPage />)

    expect(screen.getByRole('heading', { name: /all courts/i })).toBeInTheDocument()
    expect(screen.queryByText(/all venues/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Gym' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Private Rentals' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryAllByTestId('venue-card-skeleton')).toHaveLength(0)
    })
  })

  it('passes access filter to the venues API and URL', async () => {
    mockFetch.mockResolvedValue(createVenueResponse([]))

    render(<VenuesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Gym' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('access=open_gym'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('access=open_gym'),
      { scroll: false }
    )
  })

  it('ignores stale venue list responses after search changes', async () => {
    let resolveFirstRequest: (value: Response) => void = () => {}

    mockFetch
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveFirstRequest = resolve
      }))
      .mockResolvedValueOnce(createVenueResponse([createVenue('current', 'Current Court')]))

    render(<VenuesPage />)

    fireEvent.change(screen.getByPlaceholderText('Search by venue name, city, or address...'), {
      target: { value: 'Current' },
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    expect(await screen.findByText('Current Court')).toBeInTheDocument()

    await act(async () => {
      resolveFirstRequest(createVenueResponse([createVenue('old', 'Old Court')]))
      await Promise.resolve()
    })

    expect(screen.getByText('Current Court')).toBeInTheDocument()
    expect(screen.queryByText('Old Court')).not.toBeInTheDocument()
  })

  it('times out an unresponsive venue list request instead of showing skeletons forever', async () => {
    jest.useFakeTimers()
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal
      signal?.addEventListener('abort', () => {
        const error = new Error('Aborted')
        error.name = 'AbortError'
        reject(error)
      })
    }))

    render(<VenuesPage />)

    expect(screen.getAllByTestId('venue-card-skeleton')).toHaveLength(6)

    await act(async () => {
      jest.advanceTimersByTime(12_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('Timed out loading venues. Please try again.')).toBeInTheDocument()
    expect(screen.queryAllByTestId('venue-card-skeleton')).toHaveLength(0)
  })
})
