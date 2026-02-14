/**
 * Unit tests for auth callback route
 * GET /auth/callback
 */

const mockExchangeCodeForSession = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()

function createSupabaseMock() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: mockSingle,
  }
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
  return { nextUrl: new URL(url) }
}

const origin = 'http://localhost:3000'

describe('GET /auth/callback', () => {
  let GET: (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/callback/route')
    GET = route.GET
  })

  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('redirects to popup-success when no code and popup=true', async () => {
    const request = createRequest(`${origin}/auth/callback?popup=true`)
    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/popup-success?error=No+code+provided`
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects to login when no code and not popup', async () => {
    const request = createRequest(`${origin}/auth/callback`)
    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/login?error=No+code+provided`
    )
  })

  it('redirects to popup-success when exchange fails and popup=true', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: 'Invalid code' },
    })
    const request = createRequest(`${origin}/auth/callback?code=abc&popup=true`)
    const response = await GET(request)

    expect(response.status).toBe(302)
    const location = response.headers.get('Location')!
    expect(location).toContain('/auth/popup-success?error=')
    expect(decodeURIComponent(location)).toContain('Invalid code')
  })

  it('redirects to login when exchange fails and not popup', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: 'Invalid code' },
    })
    const request = createRequest(`${origin}/auth/callback?code=abc`)
    const response = await GET(request)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/auth/login?error=')
  })

  it('redirects to popup-success with returnTo and intent when popup and exchange succeeds', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    })
    const request = createRequest(
      `${origin}/auth/callback?code=abc&popup=true&returnTo=%2Fbook&intent=host`
    )
    const response = await GET(request)

    expect(response.status).toBe(302)
    const location = response.headers.get('Location')!
    expect(location).toContain('/auth/popup-success')
    expect(location).toContain('returnTo=%2Fbook')
    expect(location).toContain('intent=host')
  })

  it('popup flow never redirects to in-app path only to popup-success', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    })
    const request = createRequest(
      `${origin}/auth/callback?code=abc&popup=true&returnTo=%2Fsearch`
    )
    const response = await GET(request)

    const location = response.headers.get('Location')!
    expect(location.startsWith(`${origin}/auth/popup-success`)).toBe(true)
    expect(location).not.toBe(`${origin}/search`)
    expect(location).not.toBe(`${origin}/dashboard`)
  })

  it('non-popup: new user triggers upsert and redirects to returnTo', async () => {
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

    const request = createRequest(`${origin}/auth/callback?code=abc&returnTo=%2Fsearch`)
    const response = await GET(request)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        is_renter: true,
        is_venue_owner: false,
        is_admin: false,
      }),
      { onConflict: 'id' }
    )
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${origin}/search`)
  })

  it('non-popup: existing host redirects to dashboard', async () => {
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

    const request = createRequest(`${origin}/auth/callback?code=abc&returnTo=%2Fsearch`)
    const response = await GET(request)

    expect(response.headers.get('Location')).toBe(`${origin}/dashboard`)
  })

  it('non-popup: existing renter with intent=host redirects to upgrade-to-host', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'renter@example.com',
            user_metadata: { full_name: 'Renter User' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', is_venue_owner: false },
      error: null,
    })

    const request = createRequest(
      `${origin}/auth/callback?code=abc&returnTo=%2Fsearch&intent=host`
    )
    const response = await GET(request)

    expect(response.headers.get('Location')).toBe(`${origin}/auth/upgrade-to-host`)
  })

  it('non-popup: renter redirects to returnTo', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-1',
            email: 'r@example.com',
            user_metadata: { full_name: 'R' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', is_venue_owner: false },
      error: null,
    })

    const request = createRequest(`${origin}/auth/callback?code=abc&returnTo=%2Fbook`)
    const response = await GET(request)

    expect(response.headers.get('Location')).toBe(`${origin}/book`)
  })

  it('uses default returnTo /search when omitted', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    })
    const request = createRequest(`${origin}/auth/callback?code=abc&popup=true`)
    const response = await GET(request)

    const location = response.headers.get('Location')!
    expect(location).toContain('returnTo=%2Fsearch')
  })

  it('parses full_name into first_name and last_name', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'u1',
            email: 'a@b.com',
            user_metadata: { full_name: 'Jane Doe' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: null, error: {} })

    await GET(createRequest(`${origin}/auth/callback?code=x`))

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Doe',
      }),
      { onConflict: 'id' }
    )
  })

  it('handles empty or single-word full_name', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'u1',
            email: 'a@b.com',
            user_metadata: { full_name: 'Only' },
          },
        },
      },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: null, error: {} })

    await GET(createRequest(`${origin}/auth/callback?code=x`))

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Only',
        last_name: null,
      }),
      { onConflict: 'id' }
    )
  })

  it('fallback redirects to returnTo when not popup and no session path', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    const request = createRequest(`${origin}/auth/callback?code=abc&returnTo=%2Flistings`)
    const response = await GET(request)

    expect(response.headers.get('Location')).toBe(`${origin}/listings`)
  })
})
