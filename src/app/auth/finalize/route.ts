import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { finalizeAuthenticatedUser } from '@/services/authSessionService'
import { sanitizeReturnTo } from '@/lib/auth/oauthFlow'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'))
  const intent = request.nextUrl.searchParams.get('intent')
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.redirect(`${origin}/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const finalization = await finalizeAuthenticatedUser({
    supabase,
    session,
    intent,
  })

  if (finalization.needsUpgrade) {
    return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
  }

  const redirectPath = finalization.finalIsHost ? '/my-bookings' : returnTo
  return NextResponse.redirect(`${origin}${redirectPath}`)
}
