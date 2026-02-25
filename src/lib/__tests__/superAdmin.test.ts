import { getSuperAdminEmailAllowlist, isSuperAdminEmail } from '../superAdmin'

describe('superAdmin helpers', () => {
  const original = process.env.SUPER_ADMIN_EMAILS

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS
    } else {
      process.env.SUPER_ADMIN_EMAILS = original
    }
  })

  it('uses default maintainer email when env allowlist is not configured', () => {
    delete process.env.SUPER_ADMIN_EMAILS
    expect(getSuperAdminEmailAllowlist()).toEqual(['jensenmiers@gmail.com'])
    expect(isSuperAdminEmail('jensenmiers@gmail.com')).toBe(true)
  })

  it('uses configured comma-separated allowlist when provided', () => {
    process.env.SUPER_ADMIN_EMAILS = 'owner@example.com, jensenmiers@gmail.com'
    expect(isSuperAdminEmail('owner@example.com')).toBe(true)
    expect(isSuperAdminEmail('not-allowed@example.com')).toBe(false)
  })
})
