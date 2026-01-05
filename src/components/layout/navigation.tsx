'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, error: userError } = useCurrentUser()

  // Home link points to /venues for all authenticated users
  const homeHref = '/venues'
  // Check if current path matches the home route
  const isHomeActive = pathname === homeHref

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getUserDisplayName = () => {
    if (!user) return ''
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email?.split('@')[0] || 'User'
  }

  const getUserInitials = () => {
    if (!user) return ''
    if (user.first_name || user.last_name) {
      const first = user.first_name?.[0] || ''
      const last = user.last_name?.[0] || ''
      return `${first}${last}`.toUpperCase() || user.email?.[0].toUpperCase() || 'U'
    }
    return user.email?.[0].toUpperCase() || 'U'
  }

  return (
    <nav className="border-b border-border/40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500" />
          <span className="text-xl font-bold text-primary-800">Play Bookings</span>
        </Link>

        <div className="hidden md:flex md:items-center md:space-x-6">
          {user && (
            <Link
              href={homeHref}
              className={`text-sm font-medium transition-colors ${
                isHomeActive
                  ? 'text-primary-700'
                  : 'text-primary-500 hover:text-primary-700'
              }`}
            >
              Home
            </Link>
          )}
          {loading && !userError ? (
            <>
              <div className="h-9 w-20 animate-pulse rounded-xl bg-primary-100" />
              <div className="h-9 w-24 animate-pulse rounded-xl bg-primary-100" />
            </>
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-primary-700'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {getUserInitials()}
                  </div>
                  <span className="text-sm font-medium text-primary-700">
                    {getUserDisplayName()}
                  </span>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border/60 text-primary-700 hover:bg-primary-100"
                >
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/venues"
                className="text-sm font-medium text-primary-500 transition-colors hover:text-primary-700"
              >
                Browse
              </Link>
              <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="sm" className="md:hidden text-primary-600 hover:text-primary-800">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>
      </div>
    </nav>
  )
}
