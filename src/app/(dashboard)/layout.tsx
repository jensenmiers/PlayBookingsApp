'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { SidebarNavigation } from '@/components/dashboard/sidebar-navigation'
import { Navigation } from '@/components/layout/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

// Dashboard routes that are restricted to venue owners only
const VENUE_OWNER_ONLY_ROUTES = ['/dashboard', '/listings', '/payouts', '/messages', '/settings']

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useCurrentUser()

  // Redirect unauthorized users or renters away from venue-owner-only routes
  useEffect(() => {
    if (loading) return

    const isVenueOwnerOnlyRoute = VENUE_OWNER_ONLY_ROUTES.some(
      (route) => pathname === route || pathname?.startsWith(`${route}/`)
    )

    if (isVenueOwnerOnlyRoute && !user?.is_venue_owner) {
      router.replace('/bookings')
    }
  }, [loading, user, pathname, router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Transform user for SidebarNavigation
  const sidebarUser = user
    ? {
        name: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`.trim()
          : user.email?.split('@')[0] || 'User',
        role: user.is_venue_owner ? 'Venue Owner' : user.is_renter ? 'Renter' : undefined,
        avatarUrl: undefined, // Can be extended later if avatar URLs are stored
      }
    : undefined

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" size="2x" />
          <p className="text-primary-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if trying to access venue-owner-only route without permission
  const isVenueOwnerOnlyRoute = VENUE_OWNER_ONLY_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  )
  
  // Don't render content while redirect is happening
  if (isVenueOwnerOnlyRoute && !user?.is_venue_owner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50">
        <div className="flex flex-col items-center gap-4">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" size="2x" />
          <p className="text-primary-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // If user is a venue owner, show universal nav + sidebar layout
  if (user?.is_venue_owner) {
    return (
      <div className="min-h-screen bg-primary-50">
        <Navigation />
        <div className="flex">
          <SidebarNavigation user={sidebarUser} onSignOut={handleSignOut} />
          <main className="flex-1 overflow-y-auto bg-primary-50 px-6 py-10 lg:px-10">
            <div className="mx-auto max-w-6xl space-y-10">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  // For renters (or non-venue owners), use universal navbar
  return (
    <div className="min-h-screen bg-primary-50">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <div className="space-y-10">{children}</div>
      </main>
    </div>
  )
}
