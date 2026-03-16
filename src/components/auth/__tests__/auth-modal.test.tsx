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

  it('shows Google Sign-In disclosure copy and privacy link', () => {
    render(<AuthModal />)

    expect(screen.getByText(/choose google or email/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
  })

  it('includes an email auth link that preserves host intent and returnTo', () => {
    useAuthModalReturn.returnTo = '/book'
    useAuthModalReturn.intent = 'host'

    render(<AuthModal />)

    expect(screen.getByRole('link', { name: /continue with email/i })).toHaveAttribute(
      'href',
      '/auth/register?returnTo=%2Fbook&intent=host'
    )
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
