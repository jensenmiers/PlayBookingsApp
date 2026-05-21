import { render, screen } from '@testing-library/react'
import VenueNotFound from '../not-found'

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <nav>Navigation</nav>,
}))

describe('VenueNotFound', () => {
  it('uses all courts wording for the directory link', () => {
    render(<VenueNotFound />)

    expect(screen.getByRole('link', { name: /browse all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.queryByText(/browse all venues/i)).not.toBeInTheDocument()
  })
})
