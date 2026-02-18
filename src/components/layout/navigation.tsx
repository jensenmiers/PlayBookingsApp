'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { createClient } from '@/lib/supabase/client'
import { useState, useRef, useEffect } from 'react'

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const isHostLanding = pathname === '/become-a-host'
  const { user, loading, error: userError } = useCurrentUser()
  const { openAuthModal } = useAuthModal()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    <nav className="relative z-40 border-b border-secondary-50/10 bg-secondary-900/90 backdrop-blur supports-[backdrop-filter]:bg-secondary-900/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-10">
        <Link href="/" className="font-semibold text-lg tracking-tight text-secondary-50/90">
          Play Bookings
        </Link>

        <div className="hidden md:flex md:items-center md:space-x-6">
          {loading && !userError ? (
            <>
              <div className="h-9 w-20 animate-pulse rounded-full bg-secondary-50/10" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-secondary-50/10" />
            </>
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-full border border-secondary-50/10 bg-secondary-800/80 px-4 py-2 transition-colors hover:bg-secondary-700 hover:border-secondary-50/20"
              >
                <svg
                  className="h-5 w-5 text-secondary-50/60"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-400/20 text-sm font-semibold text-primary-400">
                    {getUserInitials()}
                  </div>
                )}
                <span className="text-sm font-medium text-secondary-50/80">
                  {getUserDisplayName()}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-secondary-50/10 bg-secondary-800 shadow-lg">
                  <div className="py-2">
                    <Link
                      href="/my-bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                    >
                      My Bookings
                    </Link>
                    <Link
                      href="/search"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                    >
                      Find Next Availability
                    </Link>
                    <Link
                      href="/venues"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                    >
                      Discover Courts
                    </Link>
                    {!user.is_venue_owner && (
                      <Link
                        href="/become-a-host"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                      >
                        Become a Host
                      </Link>
                    )}
                    <button
                      disabled
                      className="block w-full px-4 py-2 text-left text-sm text-secondary-50/30 cursor-not-allowed"
                    >
                      Favorites
                    </button>
                    {user.is_venue_owner && (
                      <>
                        <div className="my-1 border-t border-secondary-50/10" />
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/calendar"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                        >
                          My Availability
                        </Link>
                      </>
                    )}
                    <div className="my-1 border-t border-secondary-50/10" />
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
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
                className="text-sm font-medium text-secondary-50/50 transition-colors hover:text-primary-400"
              >
                For Renters
              </Link>
              <Button 
                size="lg" 
                className="px-10 py-3 text-base"
                onClick={() => openAuthModal({ intent: 'host' })}
              >
                Get Started
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/search"
                className="text-sm font-medium text-secondary-50/50 transition-colors hover:text-primary-400"
              >
                Next Availability
              </Link>
              <div className="relative" ref={guestDropdownRef}>
                <button
                  onClick={() => setGuestDropdownOpen(!guestDropdownOpen)}
                  className="flex items-center gap-3 rounded-full border border-secondary-50/10 bg-secondary-800/80 px-4 py-2 transition-colors hover:bg-secondary-700 hover:border-secondary-50/20"
                >
                  <svg
                    className="h-5 w-5 text-secondary-50/60"
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
                  <span className="text-sm font-medium text-secondary-50/80">Sign Up</span>
                </button>

                {guestDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-secondary-50/10 bg-secondary-800 shadow-lg">
                    <div className="p-3">
                      <button
                        onClick={() => {
                          setGuestDropdownOpen(false)
                          openAuthModal()
                        }}
                        className="block w-full rounded-lg bg-primary-400 px-4 py-2.5 text-center text-sm font-semibold text-secondary-900 transition-colors hover:bg-primary-500"
                      >
                        Log in or Sign up
                      </button>
                    </div>
                    <div className="border-t border-secondary-50/10 py-2">
                      <Link
                        href="/search"
                        onClick={() => setGuestDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                      >
                        Next Availability
                      </Link>
                      <Link
                        href="/become-a-host"
                        onClick={() => setGuestDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                      >
                        Become a Host
                      </Link>
                      <button
                        disabled
                        className="block w-full px-4 py-2 text-left text-sm text-secondary-50/30 cursor-not-allowed"
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

        <Button 
          variant="ghost" 
          size="sm" 
          className="md:hidden text-secondary-50/60 hover:text-secondary-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
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

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-secondary-50/10 bg-secondary-900/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-2">
            {loading && !userError ? (
              <div className="h-10 w-full animate-pulse rounded-lg bg-secondary-50/10" />
            ) : user ? (
              <>
                <Link
                  href="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  My Bookings
                </Link>
                <Link
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  Find Next Availability
                </Link>
                <Link
                  href="/venues"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  Discover Courts
                </Link>
                {!user.is_venue_owner && (
                  <Link
                    href="/become-a-host"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                  >
                    Become a Host
                  </Link>
                )}
                {user.is_venue_owner && (
                  <>
                    <div className="my-2 border-t border-secondary-50/10" />
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/calendar"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                    >
                      My Availability
                    </Link>
                  </>
                )}
                <div className="my-2 border-t border-secondary-50/10" />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openAuthModal()
                  }}
                  className="block w-full rounded-lg bg-primary-400 px-4 py-3 text-center text-sm font-semibold text-secondary-900 transition-colors hover:bg-primary-500"
                >
                  Log in or Sign up
                </button>
                <Link
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  Next Availability
                </Link>
                <Link
                  href="/become-a-host"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-sm font-medium text-secondary-50/70 transition-colors hover:bg-secondary-50/10 hover:text-secondary-50"
                >
                  Become a Host
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
