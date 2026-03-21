export {}

const mockVerifyOtp = jest.fn()
const mockSingle = jest.fn()
const mockUpsert = jest.fn()

function createSupabaseMock() {
  return {
    auth: {
      verifyOtp: mockVerifyOtp,
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

describe('GET /auth/confirm', () => {
  let GET: (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>

  beforeAll(async () => {
    const route = await import('@/app/auth/confirm/route')
    GET = route.GET as unknown as (request: { nextUrl: URL }) => Promise<{ status: number; headers: { get: (n: string) => string | null } }>
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
  })

  it('verifies email and redirects new email/password signups to the phone prompt', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: {
        session: {
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
        `${origin}/auth/confirm?token_hash=abc&type=signup&next=%2Fsearch&phonePrompt=1`
      )
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/complete-profile?next=%2Fsearch`
    )
  })

  it('verifies magic links and redirects to the requested next path', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-2',
            email: 'magic@example.com',
            user_metadata: {},
          },
        },
      },
      error: null,
    })

    const response = await GET(
      createRequest(
        `${origin}/auth/confirm?token_hash=magic-hash&type=magiclink&next=%2Fvenues`
      )
    )

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'magic-hash',
      type: 'magiclink',
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(`${origin}/venues`)
  })

  it('redirects malformed email links to login with the invalid-link error', async () => {
    const response = await GET(
      createRequest(`${origin}/auth/confirm?type=magiclink&next=%2Fvenues`)
    )

    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      `${origin}/auth/login?error=Invalid%20or%20expired%20email%20confirmation%20link.`
    )
  })
})
