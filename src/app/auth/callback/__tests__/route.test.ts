/**
 * Unit tests for legacy auth callback compatibility shim
 * GET /auth/callback
 */

export {}

const mockExchangeCodeForSession = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()

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

describe('GET /auth/callback compatibility shim', () => {
  let GET: (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/callback/route')
    GET = route.GET as unknown as (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>
  })

  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('preserves legacy popup=true success path for stale popup clients', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: {} } },
      error: null,
    })

    const response = await GET(createRequest(`${origin}/auth/callback?code=abc&popup=true`))

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${origin}/auth/popup-success?returnTo=%2Fsearch`)
  })

  it('preserves legacy non-popup redirect path for stale full-window clients', async () => {
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
      createRequest(`${origin}/auth/callback?code=abc&returnTo=%2Fsearch`)
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${origin}/search`)
    expect(mockUpsert).toHaveBeenCalled()
  })

  it('still sends legacy popup errors to popup-success when popup=true', async () => {
    const response = await GET(createRequest(`${origin}/auth/callback?popup=true`))

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/popup-success?error=No+code+provided`
    )
  })
})
