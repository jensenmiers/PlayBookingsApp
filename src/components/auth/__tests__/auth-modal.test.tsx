/**
 * Unit tests for AuthModal
 * Redirect-only OAuth URL and preserved auth resume state
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { AuthModal } from '../auth-modal'

const mockCloseAuthModal = jest.fn()
const mockNavigateToUrl = jest.fn()

let useAuthModalReturn: {
  isOpen: boolean
  intent: 'host' | undefined
  entryMode: 'mixed' | 'login'
  returnTo: string | undefined
  resumeState:
    | {
        type: 'create-booking-form'
        venueId: string
        date: string
        startTime: string
        endTime: string
        recurringType: 'none'
        notes: string
      }
    | undefined
  contextMessage: string | null
  closeAuthModal: () => void
} = {
  isOpen: true,
  intent: undefined,
  entryMode: 'login',
  returnTo: undefined,
  resumeState: undefined,
  contextMessage: null,
  closeAuthModal: mockCloseAuthModal,
}

jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => useAuthModalReturn,
}))

jest.mock('@/lib/auth/clientNavigation', () => ({
  navigateToUrl: (...args: unknown[]) => mockNavigateToUrl(...args),
}))

jest.mock('@/lib/auth/authResume', () => ({
  persistAuthResumeState: jest.fn(),
}))

const { persistAuthResumeState: mockPersistAuthResumeState } = jest.requireMock(
  '@/lib/auth/authResume'
) as {
  persistAuthResumeState: jest.Mock
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNavigateToUrl.mockReset()
  useAuthModalReturn = {
    isOpen: true,
    intent: undefined,
    entryMode: 'login',
    returnTo: undefined,
    resumeState: undefined,
    contextMessage: null,
    closeAuthModal: mockCloseAuthModal,
  }
})

describe('AuthModal', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('navigates main window to /api/auth/redirect-oauth when Continue with Google is clicked', () => {
    render(<AuthModal />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/api/auth/redirect-oauth')
  })

  it('shows the privacy link without the calendar disclosure copy', () => {
    render(<AuthModal />)

    expect(screen.queryByText(/choose google or email/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })

  it('preserves host intent and returnTo on the host email auth link', () => {
    useAuthModalReturn.returnTo = '/book'
    useAuthModalReturn.intent = 'host'

    render(<AuthModal />)

    expect(screen.getByRole('link', { name: /continue with email/i })).toHaveAttribute(
      'href',
      '/auth/register?returnTo=%2Fbook&intent=host'
    )
  })

  it('renders a login email link in login mode for renter auth prompts', () => {
    useAuthModalReturn.returnTo = '/book'

    render(<AuthModal />)

    expect(screen.getByRole('link', { name: /log in with email/i })).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fbook'
    )
  })

  it('renders mixed account entry with separate create-account and login email links', () => {
    useAuthModalReturn.entryMode = 'mixed'
    useAuthModalReturn.returnTo = '/search'

    render(<AuthModal />)

    expect(screen.getByRole('heading', { name: /welcome to play bookings 🏀/i })).toBeInTheDocument()
    expect(
      screen.getByText(/book courts, manage reservations, save your favorite gyms\./i)
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create account with email/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^log in with email$/i })).toHaveAttribute(
      'href',
      '/auth/login?returnTo=%2Fsearch'
    )
    expect(screen.getByRole('link', { name: /^create account$/i })).toHaveAttribute(
      'href',
      '/auth/register?returnTo=%2Fsearch'
    )

    const emailLinks = screen
      .getAllByRole('link')
      .filter((link) => /email|create account/i.test(link.textContent ?? ''))
      .map((link) => link.textContent)

    expect(emailLinks).toEqual(['Log in with Email', 'Create account'])
  })

  it('closes the auth modal before navigating from mixed-entry email links', () => {
    useAuthModalReturn.entryMode = 'mixed'

    render(<AuthModal />)

    fireEvent.click(screen.getByRole('link', { name: /^log in with email$/i }))
    expect(mockCloseAuthModal).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('link', { name: /^create account$/i }))
    expect(mockCloseAuthModal).toHaveBeenCalledTimes(2)
  })

  it('closes the auth modal before navigating from the single email link', () => {
    render(<AuthModal />)

    fireEvent.click(screen.getByRole('link', { name: /log in with email/i }))

    expect(mockCloseAuthModal).toHaveBeenCalledTimes(1)
  })

  it('includes returnTo and intent=host in redirect URL when set', () => {
    useAuthModalReturn.returnTo = '/book'
    useAuthModalReturn.intent = 'host'

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/api/auth/redirect-oauth?returnTo=%2Fbook&intent=host'
    )
  })

  it('persists auth resume state before navigating', async () => {
    useAuthModalReturn.returnTo = '/search#map'
    useAuthModalReturn.resumeState = {
      type: 'create-booking-form',
      venueId: 'venue-1',
      date: '2026-03-20',
      startTime: '18:00:00',
      endTime: '19:00:00',
      recurringType: 'none',
      notes: 'Bring a ball',
    }

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(mockPersistAuthResumeState).toHaveBeenCalledWith({
        returnTo: '/search#map',
        resumeState: {
          type: 'create-booking-form',
          venueId: 'venue-1',
          date: '2026-03-20',
          startTime: '18:00:00',
          endTime: '19:00:00',
          recurringType: 'none',
          notes: 'Bring a ball',
        },
      })
    })
  })

  it('renders without crash when isOpen becomes false', () => {
    const { rerender } = render(<AuthModal />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()

    useAuthModalReturn.isOpen = false
    rerender(<AuthModal />)
    expect(mockCloseAuthModal).not.toHaveBeenCalled()
  })

  it('sets loading false when redirect navigation throws', async () => {
    mockNavigateToUrl.mockImplementation(() => {
      throw new Error('navigation failed')
    })

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(mockNavigateToUrl).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: /continue with google/i })).not.toBeDisabled()
  })
})
