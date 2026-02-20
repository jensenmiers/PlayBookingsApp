import { render, screen } from '@testing-library/react'
import UpgradeToHostPage from '../page'

describe('UpgradeToHostPage', () => {
  it('shows a host onboarding coming soon notice', async () => {
    render(<UpgradeToHostPage />)

    expect(await screen.findByText(/host onboarding is coming soon/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /yes, add host capabilities/i })).not.toBeInTheDocument()
  })
})
