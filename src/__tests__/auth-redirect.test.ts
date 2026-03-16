/**
 * Auth flow helper regression tests
 */

import {
  buildAuthInitiationPath,
  sanitizeReturnTo,
} from '@/lib/auth/oauthFlow'

describe('sanitizeReturnTo', () => {
  describe('redirect flow defaults', () => {
    it('returns /search when returnTo is null', () => {
      expect(sanitizeReturnTo(null)).toBe('/search')
    })

    it('preserves valid returnTo path', () => {
      expect(sanitizeReturnTo('/book/venue/123')).toBe('/book/venue/123')
    })
  })

  describe('open redirect prevention', () => {
    it('rejects double slash (protocol-relative URL)', () => {
      expect(sanitizeReturnTo('//evil.com')).toBe('/search')
    })

    it('rejects HTTP protocol URL', () => {
      expect(sanitizeReturnTo('http://evil.com')).toBe('/search')
    })
  })

  describe('edge cases', () => {
    it('accepts path with query params', () => {
      expect(sanitizeReturnTo('/book?venue=123&date=2024-01-01')).toBe(
        '/book?venue=123&date=2024-01-01'
      )
    })

    it('accepts path with hash', () => {
      expect(sanitizeReturnTo('/book#section')).toBe('/book#section')
    })
  })
})

describe('buildAuthInitiationPath', () => {
  it('builds redirect initiation path without params when not provided', () => {
    expect(buildAuthInitiationPath({})).toBe('/api/auth/redirect-oauth')
  })

  it('builds redirect initiation path with encoded returnTo', () => {
    expect(
      buildAuthInitiationPath({
        returnTo: '/book/venue/123',
      })
    ).toBe('/api/auth/redirect-oauth?returnTo=%2Fbook%2Fvenue%2F123')
  })

  it('includes host intent when present', () => {
    expect(
      buildAuthInitiationPath({
        returnTo: '/dashboard',
        intent: 'host',
      })
    ).toBe('/api/auth/redirect-oauth?returnTo=%2Fdashboard&intent=host')
  })

  it('omits unsupported intents', () => {
    expect(
      buildAuthInitiationPath({
        intent: 'renter',
      })
    ).toBe('/api/auth/redirect-oauth')
  })
})
