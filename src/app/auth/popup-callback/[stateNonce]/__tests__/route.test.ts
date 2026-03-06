/**
 * Unit tests for nonce-based popup auth callback
 * GET /auth/popup-callback/[stateNonce]
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

describe('GET /auth/popup-callback/[stateNonce]', () => {
  let GET: (
    request: { nextUrl: URL },
    context: RouteContext
  ) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/popup-callback/[stateNonce]/route')
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
      flowType: 'popup',
      returnTo: '/',
      intent: null,
    })
    mockMarkAuthOAuthStateUsed.mockResolvedValue(undefined)
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('redirects popup success without relying on popup=true and runs user upsert', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'popup@example.com',
            user_metadata: { full_name: 'Popup User' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const response = await GET(
      createRequest(`${origin}/auth/popup-callback/state-123?code=abc`),
      createContext('state-123')
    )

    expect(mockResolveAuthOAuthState).toHaveBeenCalledWith({
      stateNonce: 'state-123',
      expectedFlowType: 'popup',
    })
    expect(response.headers.get('Location')).toBe(`${origin}/auth/popup-success`)
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockMarkAuthOAuthStateUsed).toHaveBeenCalledWith('state-123')
  })

  it('redirects popup errors to popup-success when code is missing', async () => {
    const response = await GET(
      createRequest(`${origin}/auth/popup-callback/state-123`),
      createContext('state-123')
    )

    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/popup-success?error=${encodeURIComponent('No code provided')}`
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects popup errors to popup-success when state is invalid', async () => {
    mockResolveAuthOAuthState.mockResolvedValue(null)

    const response = await GET(
      createRequest(`${origin}/auth/popup-callback/state-123?code=abc`),
      createContext('state-123')
    )

    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/popup-success?error=${encodeURIComponent('Invalid or expired authentication state')}`
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('never redirects popup callback into app routes', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: { id: 'user-1', is_venue_owner: true }, error: null })

    const response = await GET(
      createRequest(`${origin}/auth/popup-callback/state-123?code=abc`),
      createContext('state-123')
    )

    const location = response.headers.get('Location')!
    expect(location).toBe(`${origin}/auth/popup-success`)
    expect(location).not.toBe(`${origin}/search`)
    expect(location).not.toBe(`${origin}/my-bookings`)
  })
})
