import { render, screen } from '@testing-library/react'
import LoginPage from '../page'

const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  it('explains that Google Sign-In does not request calendar access', () => {
    render(<LoginPage />)

    expect(
      screen.getByText(/google sign-in only\. calendar access is requested separately/i)
    ).toBeInTheDocument()
  })

  it('renders the public privacy policy link', () => {
    render(<LoginPage />)

    expect(screen.getAllByRole('link', { name: /privacy policy/i })[0]).toHaveAttribute('href', '/privacy')
  })
})
