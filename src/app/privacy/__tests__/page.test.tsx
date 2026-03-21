import { render, screen } from '@testing-library/react'
import PrivacyPage, { metadata } from '../page'

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/layout/public-site-footer', () => ({
  PublicSiteFooter: () => <div>Public Footer</div>,
}))

describe('PrivacyPage', () => {
  it('renders the required Google data disclosures and privacy contact', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: /privacy policy/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/effective date: march 6, 2026/i)).toBeInTheDocument()
    expect(screen.queryByText(/in short:/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /google sign-in data use/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/we use google via supabase auth/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /google calendar data use/i, level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/optional integration only applies to venue admins/i)).toBeInTheDocument()
    expect(screen.getByText(/optional host calendar connection data for venue owners/i)).toBeInTheDocument()
    expect(screen.getAllByText(/generate bookable availability windows/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/does not write to google calendar/i)).toBeInTheDocument()
    expect(screen.getByText(/does not sell google user data/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /jensen@playbookings.com/i })).toHaveAttribute(
      'href',
      'mailto:jensen@playbookings.com'
    )
  })

  it('exports privacy-specific metadata', () => {
    expect(metadata.title).toBe('Privacy Policy')
    expect(metadata.description).toMatch(/google user data/i)
    expect(metadata.description).not.toMatch(/google calendar/i)
    expect(metadata.alternates?.canonical).toBe('/privacy')
  })
})
