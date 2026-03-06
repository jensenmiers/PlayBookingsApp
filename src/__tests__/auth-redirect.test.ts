/**
 * Auth flow helper regression tests
 */

import {
  buildAuthInitiationPath,
  sanitizeReturnTo,
} from '@/lib/auth/oauthFlow'

describe('sanitizeReturnTo', () => {
  describe('redirect flow defaults', () => {
    it('returns /search when redirect returnTo is null', () => {
      expect(sanitizeReturnTo(null, 'redirect')).toBe('/search')
    })

    it('preserves valid redirect returnTo path', () => {
      expect(sanitizeReturnTo('/book/venue/123', 'redirect')).toBe('/book/venue/123')
    })
  })

  describe('popup flow defaults', () => {
    it('returns / when popup returnTo is null', () => {
      expect(sanitizeReturnTo(null, 'popup')).toBe('/')
    })

    it('accepts root path for popup flow', () => {
      expect(sanitizeReturnTo('/', 'popup')).toBe('/')
    })
  })

  describe('open redirect prevention', () => {
    it('rejects double slash (protocol-relative URL)', () => {
      expect(sanitizeReturnTo('//evil.com', 'redirect')).toBe('/search')
    })

    it('rejects HTTP protocol URL', () => {
      expect(sanitizeReturnTo('http://evil.com', 'redirect')).toBe('/search')
    })

    it('rejects HTTPS protocol URL', () => {
      expect(sanitizeReturnTo('https://evil.com', 'popup')).toBe('/')
    })
  })

  describe('edge cases', () => {
    it('accepts path with query params', () => {
      expect(sanitizeReturnTo('/book?venue=123&date=2024-01-01', 'redirect')).toBe(
        '/book?venue=123&date=2024-01-01'
      )
    })

    it('accepts path with hash', () => {
      expect(sanitizeReturnTo('/book#section', 'redirect')).toBe('/book#section')
    })
  })
})

describe('buildAuthInitiationPath', () => {
  it('builds popup initiation path without params when not provided', () => {
    expect(buildAuthInitiationPath({ flowType: 'popup' })).toBe('/api/auth/popup-oauth')
  })

  it('builds redirect initiation path with encoded returnTo', () => {
    expect(
      buildAuthInitiationPath({
        flowType: 'redirect',
        returnTo: '/book/venue/123',
      })
    ).toBe('/api/auth/redirect-oauth?returnTo=%2Fbook%2Fvenue%2F123')
  })

  it('includes host intent when present', () => {
    expect(
      buildAuthInitiationPath({
        flowType: 'redirect',
        returnTo: '/dashboard',
        intent: 'host',
      })
    ).toBe('/api/auth/redirect-oauth?returnTo=%2Fdashboard&intent=host')
  })

  it('omits unsupported intents', () => {
    expect(
      buildAuthInitiationPath({
        flowType: 'popup',
        intent: 'renter',
      })
    ).toBe('/api/auth/popup-oauth')
  })
})
