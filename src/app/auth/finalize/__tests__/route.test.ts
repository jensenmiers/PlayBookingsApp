export {}

const mockGetSession = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()

function createSupabaseMock() {
  return {
    auth: {
      getSession: mockGetSession,
    },
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

describe('GET /auth/finalize', () => {
  let GET: (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/finalize/route')
    GET = route.GET as unknown as (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
  })

  it('finalizes password sign-in and falls back to the normal destination when host onboarding is disabled', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          user: {
            id: 'user-1',
            email: 'jane@example.com',
            user_metadata: {
              full_name: 'Jane Doe',
            },
          },
        },
      },
      error: null,
    })

    const response = await GET(
      createRequest(
        `${origin}/auth/finalize?returnTo=%2Fsearch&intent=host`
      )
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${origin}/search`)
  })
})
