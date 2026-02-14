/**
 * Unit tests for popup success page
 * /auth/popup-success
 */

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import PopupSuccessPage from '../page'

const mockPush = jest.fn()
const mockGet = jest.fn()
let broadcastChannelName: string | null = null
const broadcastPostMessageCalls: unknown[] = []
const broadcastCloseCalls: number[] = []

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  broadcastChannelName = null
  broadcastPostMessageCalls.length = 0
  broadcastCloseCalls.length = 0
  ;(global as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class MockBroadcastChannel {
    name: string
    constructor(name: string) {
      this.name = name
      broadcastChannelName = name
    }
    postMessage(data: unknown) {
      broadcastPostMessageCalls.push(data)
    }
    close() {
      broadcastCloseCalls.push(1)
    }
  }
})

afterEach(() => {
  jest.useRealTimers()
})

describe('PopupSuccessPage', () => {
  it('renders Success and Closing when no error param', async () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? null : null))

    render(<PopupSuccessPage />)

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument()
    })
    expect(screen.getByText('Closing this window...')).toBeInTheDocument()
  })

  it('creates BroadcastChannel with play-bookings-auth and posts AUTH_COMPLETE', async () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? null : null))

    render(<PopupSuccessPage />)

    await waitFor(() => {
      expect(broadcastChannelName).toBe('play-bookings-auth')
    })
    expect(broadcastPostMessageCalls).toContainEqual({ type: 'AUTH_COMPLETE' })
  })

  it('renders Authentication Error and message when error param is set', async () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? 'Invalid session' : null))

    render(<PopupSuccessPage />)

    await waitFor(() => {
      expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    })
    expect(screen.getByText('Invalid session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls window.close when Try Again is clicked', async () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? 'Some error' : null))
    const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {})

    render(<PopupSuccessPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(closeSpy).toHaveBeenCalled()
    closeSpy.mockRestore()
  })

  it('shows close-failed UI and does not navigate when window.close throws', async () => {
    mockGet.mockImplementation((key: string) =>
      key === 'error' ? null : key === 'returnTo' ? '/dashboard' : null
    )
    jest.spyOn(window, 'close').mockImplementation(() => {
      throw new Error('close not allowed')
    })

    render(<PopupSuccessPage />)

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(screen.getByText('Sign-in Complete')).toBeInTheDocument()
    })
    expect(screen.getByText('Please close this window to continue.')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('on success does not call router.push when window.close does not throw', async () => {
    mockGet.mockImplementation((key: string) => (key === 'error' ? null : null))
    const closeSpy = jest.spyOn(window, 'close').mockImplementation(() => {})

    render(<PopupSuccessPage />)

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    expect(closeSpy).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    closeSpy.mockRestore()
  })
})
