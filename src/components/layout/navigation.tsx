'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import { useState, useRef, useEffect } from 'react'

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const isHostLanding = pathname === '/become-a-host'
  const { user, loading, error: userError } = useCurrentUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const guestDropdownRef = useRef<HTMLDivElement>(null)

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false)
  }, [user?.id, user?.avatar_url])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target as Node)) {
        setGuestDropdownOpen(false)
      }
    }

    if (dropdownOpen || guestDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, guestDropdownOpen])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDropdownOpen(false)
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
    <nav className="relative z-40 border-b border-border/40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500" />
          <span className="text-xl font-bold text-primary-800">Play Bookings</span>
        </Link>

        <div className="hidden md:flex md:items-center md:space-x-6">
          {loading && !userError ? (
            <>
              <div className="h-9 w-20 animate-pulse rounded-xl bg-primary-100" />
              <div className="h-9 w-24 animate-pulse rounded-xl bg-primary-100" />
            </>
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-full border border-primary-200 bg-white/80 px-4 py-2 transition-colors hover:bg-white hover:border-primary-300"
              >
                {/* Hamburger icon */}
                <svg
                  className="h-5 w-5 text-primary-600"
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
                {/* User profile photo or initials */}
                {user.avatar_url && !avatarError ? (
                  <Image
                    src={user.avatar_url}
                    alt={getUserDisplayName()}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={() => setAvatarError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {getUserInitials()}
                  </div>
                )}
                {/* User name */}
                <span className="text-sm font-medium text-primary-700">
                  {getUserDisplayName()}
                </span>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border/60 bg-white shadow-lg">
                  <div className="py-2">
                    <Link
                      href="/bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      Reservations
                    </Link>
                    <Link
                      href="/search"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      Find a Court
                    </Link>
                    <Link
                      href="/venues"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      Court Directory
                    </Link>
                    <Link
                      href="/become-a-host"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      List a Space
                    </Link>
                    <button
                      disabled
                      className="block w-full px-4 py-2 text-left text-sm text-primary-400 cursor-not-allowed"
                    >
                      Favorites
                    </button>
                    <div className="my-1 border-t border-border/40" />
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isHostLanding ? (
            <>
              <Link
                href="/search"
                className="text-sm font-medium text-primary-500 transition-colors hover:text-primary-700"
              >
                For Renters
              </Link>
              <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
                <Link href="/auth/register?intent=host">Get Started</Link>
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/search"
                className="text-sm font-medium text-primary-500 transition-colors hover:text-primary-700"
              >
                Find a Court
              </Link>
              <div className="relative" ref={guestDropdownRef}>
                <button
                  onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}
                  className="flex items-center gap-3 rounded-full border border-primary-200 bg-white/80 px-4 py-2 transition-colors hover:bg-white hover:border-primary-300"
                >
                  {/* Hamburger icon */}
                  <svg
                    className="h-5 w-5 text-primary-600"
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
                  <span className="text-sm font-medium text-primary-700">Sign Up</span>
                </button>

                {/* Guest dropdown menu */}
                {guestDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border/60 bg-white shadow-lg">
                    <div className="p-3">
                      <Link
                        href="/auth/register"
                        onClick={() => setGuestDropdownOpen(false)}
                        className="block w-full rounded-lg bg-secondary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-secondary-700"
                      >
                        Log in or Sign up
                      </Link>
                    </div>
                    <div className="border-t border-border/40 py-2">
                      <Link
                        href="/search"
                        onClick={() => setGuestDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                      >
                        Find a Court
                      </Link>
                      <Link
                        href="/become-a-host"
                        onClick={() => setGuestDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-primary-700 transition-colors hover:bg-primary-50"
                      >
                        Become a Host
                      </Link>
                      <button
                        disabled
                        className="block w-full px-4 py-2 text-left text-sm text-primary-400 cursor-not-allowed"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
