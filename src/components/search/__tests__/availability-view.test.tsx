import { render, screen } from '@testing-library/react'
import { AvailabilityView } from '../availability-view'

const mockUseAvailabilitySlots = jest.fn()

jest.mock('@/hooks/useVenues', () => ({
  useAvailabilitySlots: (params: unknown) => mockUseAvailabilitySlots(params),
}))

jest.mock('@/components/search/availability-card', () => ({
  AvailabilityCard: () => <div data-testid="availability-card" />,
}))

jest.mock('@/components/search/venue-card-skeleton', () => ({
  VenueCardSkeleton: () => <div data-testid="venue-card-skeleton" />,
}))

jest.mock('@/components/ui/error-message', () => ({
  ErrorMessage: ({ error }: { error: string }) => <div>{error}</div>,
}))

describe('AvailabilityView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAvailabilitySlots.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  it('uses all courts wording for the directory escape hatch', () => {
    render(<AvailabilityView />)

    expect(screen.getByRole('link', { name: /or browse all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.queryByText(/all venues/i)).not.toBeInTheDocument()
  })
})
