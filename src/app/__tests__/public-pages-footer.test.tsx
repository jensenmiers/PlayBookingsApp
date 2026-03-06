import { render, screen } from '@testing-library/react'
import HomePage from '../page'
import SearchPage from '../search/page'
import VenuesPage from '../venues/page'

const mockPush = jest.fn()
const mockFetch = jest.fn()
const mockRpc = jest.fn()

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/search/split-availability-view', () => ({
  SplitAvailabilityView: () => <div>Split Availability View</div>,
}))

jest.mock('@/components/venues/venue-card', () => ({
  VenueCard: () => <div>Venue Card</div>,
}))

jest.mock('@/components/search/venue-card-skeleton', () => ({
  VenueCardSkeleton: () => <div>Venue Card Skeleton</div>,
}))

jest.mock('@/components/ui/error-message', () => ({
  ErrorMessage: ({ error }: { error: string }) => <div>{error}</div>,
}))

jest.mock('@/hooks/useVenues', () => ({
  useVenues: () => ({
    data: [],
    loading: false,
  }),
}))

jest.mock('@/hooks/useVenuesWithNextAvailable', () => ({
  useVenuesWithNextAvailable: () => ({
    data: [],
    loading: false,
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}))

describe('public page footer wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0,
        },
      }),
    })
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it('renders the privacy link on the home page', () => {
    render(<HomePage />)

    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })

  it('renders the privacy link on the search page', () => {
    render(<SearchPage />)

    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })

  it('renders the privacy link on the venues page', async () => {
    render(<VenuesPage />)

    expect(await screen.findByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })
})
