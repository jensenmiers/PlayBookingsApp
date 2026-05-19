import { act, renderHook, waitFor } from '@testing-library/react'
import { useCurrentUser } from '../useCurrentUser'

const mockUnsubscribe = jest.fn()
const mockSingle = jest.fn()
const mockGetUser = jest.fn()
let mockAuthStateCallback: ((event: string, session: { user?: { id: string; user_metadata?: Record<string, string> } } | null) => unknown) | null = null

const mockClient = {
  auth: {
    onAuthStateChange: jest.fn((callback) => {
      mockAuthStateCallback = callback
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      }
    }),
    getUser: mockGetUser,
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: mockSingle,
      })),
    })),
  })),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}))

describe('useCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthStateCallback = null
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'renter@example.com',
        first_name: 'Renter',
        last_name: 'User',
      },
      error: null,
    })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: {
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      },
    })
  })

  it('does not return a promise from the auth state callback while loading the profile', async () => {
    const { result } = renderHook(() => useCurrentUser())

    expect(mockAuthStateCallback).toEqual(expect.any(Function))

    let callbackReturn: unknown
    act(() => {
      callbackReturn = mockAuthStateCallback?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          user_metadata: {},
        },
      })
    })

    expect(callbackReturn).toBeUndefined()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user?.id).toBe('user-1')
    expect(result.current.user?.avatar_url).toBe('https://example.com/avatar.jpg')
    expect(result.current.error).toBeNull()
  })
})
