import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterPage from '../page'

const mockGet = jest.fn()
const mockSignUp = jest.fn()
const mockResend = jest.fn()

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

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account with email/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the public privacy policy link', () => {
    render(<RegisterPage />)

    expect(screen.getAllByRole('link', { name: /privacy policy/i })[0]).toHaveAttribute('href', '/privacy')
  })

  it('submits email signup and shows a check-your-email state', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'intent') return 'host'
      if (key === 'returnTo') return '/dashboard'
      return null
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Jane' },
    })
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account with email/i }))

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
  })

  it('resends the verification email from the post-signup state', async () => {
    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Jane' },
    })
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account with email/i }))

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
