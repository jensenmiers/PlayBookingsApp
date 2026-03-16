/**
 * Unit tests for nonce-based redirect auth callback
 * GET /auth/callback/[stateNonce]
 */

export {}

const mockExchangeCodeForSession = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()
const mockResolveAuthOAuthState = jest.fn()
const mockMarkAuthOAuthStateUsed = jest.fn()

function createSupabaseMock() {
  return {
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingle })) })),
      upsert: mockUpsert,
    })),
  }
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockImplementation(() => Promise.resolve(createSupabaseMock())),
}))

jest.mock('@/services/authOAuthStateService', () => ({
  resolveAuthOAuthState: (...args: unknown[]) => mockResolveAuthOAuthState(...args),
  markAuthOAuthStateUsed: (...args: unknown[]) => mockMarkAuthOAuthStateUsed(...args),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string | URL) => {
      const href = typeof url === 'string' ? url : url.href
      return {
        status: 302,
        headers: { get: (name: string) => (name === 'Location' ? href : null) },
      }
    },
  },
}))

type RouteContext = { params: Promise<{ stateNonce: string }> }

function createRequest(url: string): { nextUrl: URL } {
  return { nextUrl: new URL(url) }
}

function createContext(stateNonce: string): RouteContext {
  return {
    params: Promise.resolve({ stateNonce }),
  }
}

const origin = 'http://localhost:3000'

describe('GET /auth/callback/[stateNonce]', () => {
  let GET: (
    request: { nextUrl: URL },
    context: RouteContext
  ) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/callback/[stateNonce]/route')
    GET = route.GET as unknown as (
      request: { nextUrl: URL },
      context: RouteContext
    ) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>
  })

  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    mockResolveAuthOAuthState.mockResolvedValue({
      flowType: 'redirect',
      returnTo: '/search',
      intent: null,
    })
    mockMarkAuthOAuthStateUsed.mockResolvedValue(undefined)
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('redirects renter to stored returnTo and marks state used on success', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'jane@example.com',
            user_metadata: { full_name: 'Jane Doe' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const response = await GET(
      createRequest(`${origin}/auth/callback/state-123?code=abc`),
      createContext('state-123')
    )

    expect(mockResolveAuthOAuthState).toHaveBeenCalledWith({
      stateNonce: 'state-123',
      expectedFlowType: 'redirect',
    })
    expect(response.headers.get('Location')).toBe(`${origin}/search`)
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockMarkAuthOAuthStateUsed).toHaveBeenCalledWith('state-123')
  })

  it('redirects existing host to stored returnTo', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'host@example.com',
            user_metadata: { full_name: 'Host User' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', is_venue_owner: true },
      error: null,
    })
    mockResolveAuthOAuthState.mockResolvedValue({
      flowType: 'redirect',
      returnTo: '/venue/memorial-park',
      intent: null,
    })

    const response = await GET(
      createRequest(`${origin}/auth/callback/state-123?code=abc`),
      createContext('state-123')
    )

    expect(response.headers.get('Location')).toBe(`${origin}/venue/memorial-park`)
  })

  it('redirects to login when code is missing', async () => {
    const response = await GET(
      createRequest(`${origin}/auth/callback/state-123`),
      createContext('state-123')
    )

    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/login?error=${encodeURIComponent('No code provided')}`
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects to login when state is invalid or expired', async () => {
    mockResolveAuthOAuthState.mockResolvedValue(null)

    const response = await GET(
      createRequest(`${origin}/auth/callback/state-123?code=abc`),
      createContext('state-123')
    )

    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/login?error=${encodeURIComponent('Invalid or expired authentication state')}`
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
