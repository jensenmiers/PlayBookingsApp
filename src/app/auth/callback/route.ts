import { createClient } from '@/lib/supabase/server'
import { sanitizeReturnTo } from '@/lib/auth/oauthFlow'
import { finalizeAuthenticatedUser } from '@/services/authSessionService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const isPopup = searchParams.get('popup') === 'true'
  const returnTo = searchParams.get('returnTo')
    ? sanitizeReturnTo(searchParams.get('returnTo'), 'redirect')
    : '/search'
  const intent = searchParams.get('intent')
  const origin = request.nextUrl.origin

  if (!code) {
    const errorUrl = isPopup
      ? `${origin}/auth/popup-success?error=No+code+provided`
      : `${origin}/auth/login?error=No+code+provided`
    return NextResponse.redirect(errorUrl)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange failed:', error)
    const errorUrl = isPopup
      ? `${origin}/auth/popup-success?error=${encodeURIComponent(error.message)}`
      : `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    return NextResponse.redirect(errorUrl)
  }

  // For non-popup flow, handle user profile creation/update
  if (!isPopup && data.session) {
    const finalization = await finalizeAuthenticatedUser({
      supabase,
      session: data.session,
      intent,
    })

    if (finalization.needsUpgrade) {
      return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
    }

    const redirectPath = finalization.finalIsHost ? '/my-bookings' : returnTo
    return NextResponse.redirect(`${origin}${redirectPath}`)
  }

  // Popup flow - redirect to success page
  if (isPopup) {
    const successParams = new URLSearchParams()
    if (returnTo) successParams.set('returnTo', returnTo)
    if (intent) successParams.set('intent', intent)
    return NextResponse.redirect(`${origin}/auth/popup-success?${successParams.toString()}`)
  }

  return NextResponse.redirect(`${origin}${returnTo}`)
}
