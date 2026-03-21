import { render, screen } from '@testing-library/react'

import { AuthLegalFooter } from '../auth-legal-footer'

describe('AuthLegalFooter', () => {
  it('shows the privacy policy link without the calendar access disclosure copy', () => {
    render(<AuthLegalFooter />)

    expect(screen.queryByText(/choose google or email/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })
})
