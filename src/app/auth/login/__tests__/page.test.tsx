import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '../page'

const mockGet = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockResend = jest.fn()
const mockNavigateToUrl = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      resend: mockResend,
    },
  }),
}))

jest.mock('@/lib/auth/clientNavigation', () => ({
  navigateToUrl: (...args: unknown[]) => mockNavigateToUrl(...args),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: null })
    mockResend.mockResolvedValue({ data: {}, error: null })
  })

  it('renders email/password fields alongside Google sign-in', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the public privacy policy link', () => {
    render(<LoginPage />)

    expect(screen.getAllByRole('link', { name: /privacy policy/i })[0]).toHaveAttribute('href', '/privacy')
  })

  it('routes the back to home link to the homepage', () => {
    render(<LoginPage />)

    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('signs in with password and routes through auth finalization', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'returnTo') return '/book/venue-1'
      if (key === 'intent') return 'host'
      return null
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'password123',
      })
    })

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/auth/finalize?returnTo=%2Fbook%2Fvenue-1&intent=host'
    )
  })

  it('offers resend confirmation when sign-in fails because email is unverified', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed' },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'jane@example.com',
        options: {
          emailRedirectTo: 'http://localhost/auth/confirm?phonePrompt=1',
        },
      })
    })
  })
})
