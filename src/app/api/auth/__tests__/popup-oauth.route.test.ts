/**
 * Unit tests for popup OAuth initiation route
 * GET /api/auth/popup-oauth
 */

export {}

const mockSignInWithOAuth = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
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

describe('GET /api/auth/popup-oauth', () => {
  let GET: (request: { nextUrl: URL }) => Promise<Response>

  beforeAll(async () => {
    const route = await import('@/app/api/auth/popup-oauth/route')
    GET = route.GET as unknown as (request: { nextUrl: URL }) => Promise<Response>
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to OAuth URL on success', async () => {
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=...'
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: oauthUrl },
      error: null,
    })

    const request = createRequest('http://localhost:3000/api/auth/popup-oauth')
    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(oauthUrl)
  })

  it('calls signInWithOAuth with callback URL containing popup=true and params', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/authorize' },
      error: null,
    })

    const request = createRequest(
      'http://localhost:3000/api/auth/popup-oauth?returnTo=%2Fdashboard&intent=host'
    )
    await GET(request)

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('popup=true'),
        skipBrowserRedirect: true,
      },
    })
    const redirectTo = mockSignInWithOAuth.mock.calls[0][0].options.redirectTo
    expect(redirectTo).toContain('returnTo=%2Fdashboard')
    expect(redirectTo).toContain('intent=host')
  })

  it('includes default returnTo in callback URL when not provided', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/authorize' },
      error: null,
    })

    const request = createRequest('http://localhost:3000/api/auth/popup-oauth')
    await GET(request)

    const redirectTo = mockSignInWithOAuth.mock.calls[0][0].options.redirectTo
    expect(redirectTo).toContain('returnTo=%2F')
  })

  it('redirects to popup-success with error when OAuth returns error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'Provider error' },
    })

    const request = createRequest('http://localhost:3000/api/auth/popup-oauth')
    const response = await GET(request)

    expect(response.status).toBe(302)
    const location = response.headers.get('Location')
    expect(location).toMatch(/^http:\/\/localhost:3000\/auth\/popup-success\?error=/)
    expect(decodeURIComponent(location!.split('error=')[1])).toBe('Provider error')
  })

  it('redirects to popup-success when no URL returned', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    })

    const request = createRequest('http://localhost:3000/api/auth/popup-oauth')
    const response = await GET(request)

    expect(response.status).toBe(302)
    const location = response.headers.get('Location')
    expect(location).toMatch(/^http:\/\/localhost:3000\/auth\/popup-success\?error=/)
    expect(decodeURIComponent(location!.split('error=')[1])).toBe('OAuth failed')
  })
})
