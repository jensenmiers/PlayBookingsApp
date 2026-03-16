/**
 * Unit tests for redirect OAuth initiation route
 * GET /api/auth/redirect-oauth
 */

export {}

const mockSignInWithOAuth = jest.fn()
const mockCreateAuthOAuthState = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

jest.mock('@/services/authOAuthStateService', () => ({
  createAuthOAuthState: (...args: unknown[]) => mockCreateAuthOAuthState(...args),
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

function createRequest(url: string): { nextUrl: URL } {
  return {
    nextUrl: new URL(url),
  }
}

describe('GET /api/auth/redirect-oauth', () => {
  let GET: (request: { nextUrl: URL }) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/auth/redirect-oauth/route')
    GET = route.GET as unknown as (request: { nextUrl: URL }) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateAuthOAuthState.mockResolvedValue('redirect-state-123')
  })

  it('redirects to OAuth URL on success', async () => {
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...'
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: oauthUrl },
      error: null,
    })

    const request = createRequest('http://localhost:3000/api/auth/redirect-oauth')
    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(oauthUrl)
  })

  it('creates redirect flow state and uses nonce callback path', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/authorize' },
      error: null,
    })

    const request = createRequest(
      'http://localhost:3000/api/auth/redirect-oauth?returnTo=%2Fdashboard&intent=host'
    )
    await GET(request)

    expect(mockCreateAuthOAuthState).toHaveBeenCalledWith({
      returnTo: '/dashboard',
      intent: 'host',
    })
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback/redirect-state-123',
        skipBrowserRedirect: true,
      },
    })
  })

  it('uses redirect default when returnTo is not provided', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/authorize' },
      error: null,
    })

    const request = createRequest('http://localhost:3000/api/auth/redirect-oauth')
    await GET(request)

    expect(mockCreateAuthOAuthState).toHaveBeenCalledWith({
      returnTo: null,
      intent: null,
    })
  })

  it('redirects to login with error when OAuth returns error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Provider error' },
    })

    const request = createRequest('http://localhost:3000/api/auth/redirect-oauth')
    const response = await GET(request)

    expect(response.status).toBe(302)
    const location = response.headers.get('Location')
    expect(location).toMatch(/^http:\/\/localhost:3000\/auth\/login\?error=/)
    expect(decodeURIComponent(location!.split('error=')[1])).toBe('Provider error')
  })
})
