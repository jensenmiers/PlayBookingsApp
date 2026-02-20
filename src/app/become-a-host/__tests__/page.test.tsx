import { fireEvent, render, screen } from '@testing-library/react'
import BecomeAHostPage from '../page'

const mockToast = jest.fn()

jest.mock('@/components/layout/navigation', () => ({
  Navigation: () => <div>Navigation</div>,
}))

jest.mock('@/components/ui/use-toast', () => ({
  toast: (args: unknown) => mockToast(args),
}))

describe('BecomeAHostPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows upcoming notice instead of starting host enrollment', () => {
    render(<BecomeAHostPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Get Started as a Host' }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/coming soon|upcoming/i),
      })
    )
  })
})
