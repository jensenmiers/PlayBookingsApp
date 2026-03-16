import { createClient } from '@/lib/supabase/server'
import { sanitizeReturnTo } from '@/lib/auth/oauthFlow'
import { finalizeAuthenticatedUser } from '@/services/authSessionService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const returnTo = searchParams.get('returnTo')
    ? sanitizeReturnTo(searchParams.get('returnTo'))
    : '/search'
  const intent = searchParams.get('intent')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=No+code+provided`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange failed:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data.session) {
    const finalization = await finalizeAuthenticatedUser({
      supabase,
      session: data.session,
      intent,
    })

    if (finalization.needsUpgrade) {
      return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
    }

    return NextResponse.redirect(`${origin}${returnTo}`)
  }

  return NextResponse.redirect(`${origin}${returnTo}`)
}
