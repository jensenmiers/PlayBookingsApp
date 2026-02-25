import type { AuthContext } from '@/middleware/authMiddleware'
import { forbidden } from '@/utils/errorHandling'

const DEFAULT_SUPER_ADMIN_EMAIL = 'jensenmiers@gmail.com'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getSuperAdminEmailAllowlist(): string[] {
  const configured = process.env.SUPER_ADMIN_EMAILS
  if (!configured) {
    return [DEFAULT_SUPER_ADMIN_EMAIL]
  }

  const parsed = configured
    .split(',')
    .map((value) => normalizeEmail(value))
    .filter((value) => value.length > 0)

  if (parsed.length === 0) {
    return [DEFAULT_SUPER_ADMIN_EMAIL]
  }

  return Array.from(new Set(parsed))
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  const normalized = normalizeEmail(email)
  return getSuperAdminEmailAllowlist().includes(normalized)
}

export function requireSuperAdmin(authContext: AuthContext): void {
  if (!isSuperAdminEmail(authContext.user.email)) {
    throw forbidden('Super admin access required')
  }
}
