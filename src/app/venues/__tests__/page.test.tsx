import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import VenuesPage from '../page'

const mockPush = jest.fn()
const mockFetch = jest.fn()
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

function createDiscoveryResponse(
  venues: Array<{
    id: string
    nextAvailable: {
      slotId: string
      date: string
      startTime: string
      endTime: string
      actionType: 'instant_book' | 'request_private' | 'info_only_open_gym'
      pricing: null
      displayText: string
    } | null
  }>
) {
  return createMockResponse({
    success: true,
    data: venues,
  })
}

describe('VenuesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    mockSearchParams = ''
    global.fetch = mockFetch as unknown as typeof fetch
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

  it('keeps capability pagination stable and shows a hybrid venue with its scoped rental slot', async () => {
    mockSearchParams = 'access=private_rental'
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith('/api/venues/next-available')) {
        return Promise.resolve(createDiscoveryResponse([
          {
            id: 'hybrid',
            nextAvailable: {
              slotId: 'slot-hybrid-rental',
              date: '2026-07-25',
              startTime: '14:00:00',
              endTime: '15:00:00',
              actionType: 'instant_book',
              pricing: null,
              displayText: 'Sat Jul 25, 2 PM',
            },
          },
        ]))
      }

      return Promise.resolve(createVenueResponse([
        createVenue('regular', 'Regular Court'),
        createVenue('hybrid', 'Hybrid Court'),
      ]))
    })
    render(<VenuesPage />)

    expect(await screen.findByText(/Regular Court/)).toBeInTheDocument()
    expect(await screen.findByText(/Hybrid Court Sat Jul 25, 2 PM/)).toBeInTheDocument()
    expect(screen.getByText('Showing 1-2 of 2 venues')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/venues/next-available?access=private_rental',
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('keeps private-rental venue membership stable when scoped discovery fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSearchParams = 'access=private_rental'
    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith('/api/venues/next-available')) {
        return Promise.resolve(createMockResponse(
          { success: false, error: { message: 'Discovery unavailable' } },
          { status: 500 }
        ))
      }
      return Promise.resolve(createVenueResponse([createVenue('hybrid', 'Hybrid Court')]))
    })
    render(<VenuesPage />)

    expect(await screen.findByText('Hybrid Court')).toBeInTheDocument()
    expect(screen.getByText('Showing 1-1 of 1 venue')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/venues/next-available?access=private_rental',
      expect.objectContaining({ cache: 'no-store' })
    )
    consoleErrorSpy.mockRestore()
  })

  it('does not show stale venue membership while a new access segment loads', async () => {
    let resolvePrivateRentalRequest: (value: Response) => void = () => {}

    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith('/api/venues/next-available')) {
        return Promise.resolve(createDiscoveryResponse([]))
      }
      if (url.includes('access=private_rental')) {
        return new Promise<Response>((resolve) => {
          resolvePrivateRentalRequest = resolve
        })
      }
      return Promise.resolve(
        createVenueResponse([createVenue('open-only', 'Open Gym Only Court')])
      )
    })

    render(<VenuesPage />)

    expect(await screen.findByText('Open Gym Only Court')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Private Rentals' }))

    expect(screen.queryByText('Open Gym Only Court')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('venue-card-skeleton')).toHaveLength(6)

    await act(async () => {
      resolvePrivateRentalRequest(
        createVenueResponse([createVenue('rental', 'Private Rental Court')])
      )
      await Promise.resolve()
    })

    expect(await screen.findByText('Private Rental Court')).toBeInTheDocument()
  })

  it('ignores stale venue list responses after search changes', async () => {
    let resolveFirstRequest: (value: Response) => void = () => {}
    let venueRequestCount = 0

    mockFetch.mockImplementation((url: string) => {
      if (url.startsWith('/api/venues/next-available')) {
        return Promise.resolve(createDiscoveryResponse([]))
      }

      venueRequestCount += 1
      if (venueRequestCount === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirstRequest = resolve
        })
      }

      return Promise.resolve(createVenueResponse([createVenue('current', 'Current Court')]))
    })

    render(<VenuesPage />)

    fireEvent.change(screen.getByPlaceholderText('Search by venue name, city, or address...'), {
      target: { value: 'Current' },
    })

    await waitFor(() => {
      const venueListCalls = mockFetch.mock.calls.filter(
        ([url]) => String(url).startsWith('/api/venues?')
      )
      expect(venueListCalls).toHaveLength(2)
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
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/venues/next-available')) {
        return Promise.resolve(createDiscoveryResponse([]))
      }

      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        signal?.addEventListener('abort', () => {
          const error = new Error('Aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

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
