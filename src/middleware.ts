import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // Silently ignore refresh_token_not_found errors (common when no session exists)
  try {
    await supabase.auth.getUser()
  } catch (error: any) {
    // Ignore refresh_token_not_found errors - these are expected when:
    // - User is not logged in
    // - Stale auth cookies exist from previous sessions
    // Only log actual unexpected errors
    if (error?.code !== 'refresh_token_not_found') {
      console.error('Unexpected auth error in middleware:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Only run middleware on protected routes:
     * - Dashboard routes: /dashboard, /bookings, /messages, /settings, /listings, /payouts
     * - Booking APIs: /api/bookings/*
     * 
     * Excluded (public routes):
     * - / (root)
     * - /marketing
     * - /auth/* (login, register, callback)
     * - /book (public browsing, auth only required for booking actions)
     * - Static assets (_next/static, _next/image, favicon, images)
     */
    '/dashboard(.*)',
    '/bookings(.*)',
    '/messages(.*)',
    '/settings(.*)',
    '/listings(.*)',
    '/payouts(.*)',
    '/api/bookings(.*)',
  ],
}


