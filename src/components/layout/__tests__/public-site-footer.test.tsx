import { render, screen } from '@testing-library/react'
import { PublicSiteFooter } from '../public-site-footer'

describe('PublicSiteFooter', () => {
  it('renders core public navigation links including the privacy policy', () => {
    render(<PublicSiteFooter />)

    expect(screen.getByText(/play bookings © 2026/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /list your court/i })).toHaveAttribute('href', '/become-a-host')
    expect(screen.getByRole('link', { name: /all courts/i })).toHaveAttribute('href', '/venues')
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })
})
