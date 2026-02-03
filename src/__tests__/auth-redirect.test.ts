/**
 * Auth Redirect Regression Tests
 *
 * Verifies the logic for redirect handling in the authentication flow.
 * Tests security against open redirect attacks and proper URL construction.
 */

/**
 * Validates returnTo parameter (matches callback page logic)
 */
function validateReturnTo(returnTo: string | null): string {
  const defaultPath = '/book'

  if (!returnTo) {
    return defaultPath
  }

  // Security check: only allow relative paths starting with / (but not //)
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo
  }

  return defaultPath
}

/**
 * Constructs callback URL with returnTo parameter (matches login/register logic)
 */
function constructCallbackUrl(
  returnTo: string | null,
  origin: string = 'http://localhost:3000'
): string {
  if (returnTo) {
    return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
  }
  return `${origin}/auth/callback`
}

/**
 * Constructs login URL with returnTo parameter (matches AuthRequiredDialog logic)
 */
function constructLoginUrl(
  returnTo: string | null,
  currentPath: string = '/'
): string {
  const redirectPath = returnTo || currentPath
  if (redirectPath) {
    return `/auth/login?returnTo=${encodeURIComponent(redirectPath)}`
  }
  return '/auth/login'
}

describe('validateReturnTo', () => {
  describe('default behavior', () => {
    it('returns /book when returnTo is null', () => {
      expect(validateReturnTo(null)).toBe('/book')
    })

    it('preserves valid returnTo path', () => {
      expect(validateReturnTo('/book/venue/123')).toBe('/book/venue/123')
    })

    it('accepts root path', () => {
      expect(validateReturnTo('/')).toBe('/')
    })
  })

  describe('open redirect prevention', () => {
    it('rejects double slash (protocol-relative URL)', () => {
      expect(validateReturnTo('//evil.com')).toBe('/book')
    })

    it('rejects HTTP protocol URL', () => {
      expect(validateReturnTo('http://evil.com')).toBe('/book')
    })

    it('rejects HTTPS protocol URL', () => {
      expect(validateReturnTo('https://evil.com')).toBe('/book')
    })
  })

  describe('edge cases', () => {
    it('accepts path with query params', () => {
      expect(validateReturnTo('/book?venue=123&date=2024-01-01')).toBe(
        '/book?venue=123&date=2024-01-01'
      )
    })

    it('accepts path with hash', () => {
      expect(validateReturnTo('/book#section')).toBe('/book#section')
    })
  })
})

describe('constructCallbackUrl', () => {
  it('returns callback URL without returnTo when not provided', () => {
    expect(constructCallbackUrl(null)).toBe('http://localhost:3000/auth/callback')
  })

  it('encodes returnTo parameter in callback URL', () => {
    expect(constructCallbackUrl('/book/venue/123')).toBe(
      'http://localhost:3000/auth/callback?returnTo=%2Fbook%2Fvenue%2F123'
    )
  })

  it('uses custom origin when provided', () => {
    expect(constructCallbackUrl('/dashboard', 'https://example.com')).toBe(
      'https://example.com/auth/callback?returnTo=%2Fdashboard'
    )
  })
})

describe('constructLoginUrl', () => {
  it('uses current path when returnTo is null', () => {
    expect(constructLoginUrl(null, '/')).toBe('/auth/login?returnTo=%2F')
  })

  it('uses explicit returnTo over current path', () => {
    expect(constructLoginUrl('/dashboard/settings', '/book')).toBe(
      '/auth/login?returnTo=%2Fdashboard%2Fsettings'
    )
  })

  it('auto-captures current path when returnTo not provided', () => {
    expect(constructLoginUrl(null, '/book/venue/456')).toBe(
      '/auth/login?returnTo=%2Fbook%2Fvenue%2F456'
    )
  })
})
