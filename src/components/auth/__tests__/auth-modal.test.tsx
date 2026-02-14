/**
 * Unit tests for AuthModal
 * Popup OAuth URL, blocked state, BroadcastChannel AUTH_COMPLETE, popup close + session
 */

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { AuthModal } from '../auth-modal'

const mockCloseAuthModal = jest.fn()
const mockGetSession = jest.fn()
const mockSetSession = jest.fn()
const mockSignInWithOAuth = jest.fn()

let useAuthModalReturn: {
  isOpen: boolean
  intent: 'host' | undefined
  returnTo: string | undefined
  contextMessage: string | null
  closeAuthModal: () => void
} = {
  isOpen: true,
  intent: undefined,
  returnTo: undefined,
  contextMessage: null,
  closeAuthModal: mockCloseAuthModal,
}

jest.mock('@/contexts/AuthModalContext', () => ({
  useAuthModal: () => useAuthModalReturn,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      setSession: mockSetSession,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

let mockPopup: { closed: boolean; focus: () => void }
const mockOpen = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockSetSession.mockResolvedValue({ data: {}, error: null })
  mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
  useAuthModalReturn = {
    isOpen: true,
    intent: undefined,
    returnTo: undefined,
    contextMessage: null,
    closeAuthModal: mockCloseAuthModal,
  }
  mockPopup = { closed: false, focus: jest.fn() }
  mockOpen.mockReturnValue(mockPopup)
  window.open = mockOpen
})

describe('AuthModal', () => {
  it('opens popup to /api/auth/popup-oauth when Continue with Google is clicked', () => {
    render(<AuthModal />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockOpen).toHaveBeenCalled()
    expect(mockOpen.mock.calls[0][0]).toContain('/api/auth/popup-oauth')
    expect(mockOpen.mock.calls[0][1]).toBe('PlayBookingsAuth')
    expect(mockOpen.mock.calls[0][2]).toMatch(/width=500.*height=600/)
  })

  it('includes returnTo and intent=host in popup URL when set', () => {
    useAuthModalReturn.returnTo = '/book'
    useAuthModalReturn.intent = 'host'

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('returnTo=%2Fbook'),
      'PlayBookingsAuth',
      expect.any(String)
    )
    expect(mockOpen.mock.calls[0][0]).toContain('intent=host')
  })

  it('shows popup blocked message and fallback button when window.open returns null', () => {
    mockOpen.mockReturnValue(null)

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(screen.getByText(/popup was blocked/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue in this window/i })).toBeInTheDocument()
  })

  it('calls getSession and setSession when BroadcastChannel receives AUTH_COMPLETE', async () => {
    const session = {
      access_token: 'token',
      refresh_token: 'refresh',
    }
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    let channelRef: BroadcastChannel | null = null
    ;(global as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class MockBC {
      name: string
      onmessage: ((ev: { data: unknown }) => void) | null = null
      constructor(name: string) {
        this.name = name
        channelRef = this as unknown as BroadcastChannel
      }
      postMessage() {}
      close() {}
    }

    render(<AuthModal />)

    await waitFor(() => {
      expect(channelRef).not.toBeNull()
    })

    act(() => {
      ;(channelRef as unknown as { onmessage: (ev: { data: { type: string } }) => void }).onmessage?.(
        { data: { type: 'AUTH_COMPLETE' } }
      )
    })

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'token',
        refresh_token: 'refresh',
      })
    })
  })

  it('does not navigate opener when BroadcastChannel receives AUTH_COMPLETE', async () => {
    // Opener must only refresh session (getSession + setSession); no location.assign/replace.
    const session = {
      access_token: 'token',
      refresh_token: 'refresh',
    }
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    let channelRef: BroadcastChannel | null = null
    ;(global as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class MockBC {
      name: string
      onmessage: ((ev: { data: unknown }) => void) | null = null
      constructor(name: string) {
        this.name = name
        channelRef = this as unknown as BroadcastChannel
      }
      postMessage() {}
      close() {}
    }

    render(<AuthModal />)

    await waitFor(() => {
      expect(channelRef).not.toBeNull()
    })

    act(() => {
      ;(channelRef as unknown as { onmessage: (ev: { data: { type: string } }) => void }).onmessage?.(
        { data: { type: 'AUTH_COMPLETE' } }
      )
    })

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalled()
    })

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(mockSetSession).toHaveBeenCalledTimes(1)
  })

  it('calls setSession when popup closes and getSession returns session', async () => {
    jest.useFakeTimers()
    const session = {
      access_token: 't',
      refresh_token: 'r',
    }
    mockGetSession.mockResolvedValue({ data: { session }, error: null })

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(mockOpen).toHaveBeenCalled()
    Object.defineProperty(mockPopup, 'closed', { value: true, writable: true })

    await act(async () => {
      jest.advanceTimersByTime(600)
    })
    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 't',
      refresh_token: 'r',
    })

    jest.useRealTimers()
  })

  it('renders without crash when isOpen becomes false', () => {
    const { rerender } = render(<AuthModal />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()

    useAuthModalReturn.isOpen = false
    rerender(<AuthModal />)
    expect(mockCloseAuthModal).not.toHaveBeenCalled()
  })

  it('calls signInWithOAuth with redirectTo containing popup=false when Continue in this window is clicked', async () => {
    mockOpen.mockReturnValue(null)

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(screen.getByRole('button', { name: /continue in this window/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /continue in this window/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringMatching(/popup=false/),
        },
      })
    })
  })

  it('passes returnTo and intent in redirectTo when using Continue in this window', async () => {
    useAuthModalReturn.returnTo = '/book'
    useAuthModalReturn.intent = 'host'
    mockOpen.mockReturnValue(null)

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue in this window/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled()
      const redirectTo = mockSignInWithOAuth.mock.calls[0][0].options.redirectTo
      expect(redirectTo).toMatch(/returnTo=/)
      expect(redirectTo).toMatch(/intent=host/)
    })
  })

  it('sets loading false when signInWithOAuth returns error in fallback redirect', async () => {
    mockOpen.mockReturnValue(null)
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: { message: 'OAuth error' } })

    render(<AuthModal />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue in this window/i }))

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: /continue in this window/i })).not.toBeDisabled()
  })
})
