import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterPage from '../page'

const mockGet = jest.fn()
const mockSignUp = jest.fn()
const mockResend = jest.fn()
const mockCapture = jest.fn()
const mockNavigateToUrl = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      resend: mockResend,
    },
  }),
}))

jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: (...args: unknown[]) => mockCapture(...args),
  }),
}))

jest.mock('@/lib/auth/clientNavigation', () => ({
  navigateToUrl: (...args: unknown[]) => mockNavigateToUrl(...args),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    })
    mockResend.mockResolvedValue({ data: {}, error: null })
  })

  it('renders email/password registration fields alongside Google sign-in', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/last name/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/min\. 8 characters/i)).toBeInTheDocument()
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the public privacy policy link', () => {
    render(<RegisterPage />)

    expect(screen.getAllByRole('link', { name: /privacy policy/i })[0]).toHaveAttribute('href', '/privacy')
  })

  it('records a Google signup attempt without claiming the user signed up before OAuth succeeds', () => {
    mockGet.mockImplementation((key: string) => key === 'intent' ? 'host' : null)

    render(<RegisterPage />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockCapture).toHaveBeenCalledWith('signup_started', {
      method: 'google',
      is_host_signup: true,
    }, {
      send_instantly: true,
      transport: 'sendBeacon',
    })
    expect(mockCapture).not.toHaveBeenCalledWith(
      'user_signed_up',
      expect.objectContaining({ method: 'google' })
    )
    expect(mockNavigateToUrl).toHaveBeenCalled()
  })

  it('submits email signup and shows a check-your-email state', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'intent') return 'host'
      if (key === 'returnTo') return '/dashboard'
      return null
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Jane',
            last_name: 'Doe',
            full_name: 'Jane Doe',
          },
          emailRedirectTo:
            'http://localhost/auth/confirm?next=%2Fdashboard&intent=host&phonePrompt=1',
        },
      })
    })

    expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
    expect(mockCapture).toHaveBeenNthCalledWith(1, 'signup_started', {
      method: 'email',
      is_host_signup: true,
    })
    expect(mockCapture).toHaveBeenNthCalledWith(2, 'user_signed_up', {
      method: 'email',
      is_host_signup: true,
    })
  })

  it('resends the verification email from the post-signup state', async () => {
    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Jane Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^create account$/i }))

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
