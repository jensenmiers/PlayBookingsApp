import { render, screen } from '@testing-library/react'
import RegisterPage from '../page'

const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it('explains that Google Sign-In does not request calendar access', () => {
    render(<RegisterPage />)

    expect(
      screen.getByText(/google sign-in only\. calendar access is requested separately/i)
    ).toBeInTheDocument()
  })

  it('renders the public privacy policy link', () => {
    render(<RegisterPage />)

    expect(screen.getAllByRole('link', { name: /privacy policy/i })[0]).toHaveAttribute('href', '/privacy')
  })
})
