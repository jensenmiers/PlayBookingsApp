import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { finalizeAuthenticatedUser } from '@/services/authSessionService'
import { sanitizeReturnTo } from '@/lib/auth/oauthFlow'

function redirectToLogin(origin: string, message: string) {
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
}

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value === 'signup' || value === 'invite' || value === 'magiclink' || value === 'recovery' || value === 'email_change' || value === 'email'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const intent = searchParams.get('intent')
  const phonePrompt = searchParams.get('phonePrompt') === '1'
  const returnTo = sanitizeReturnTo(searchParams.get('next'))
  const origin = request.nextUrl.origin

  if (!tokenHash || !isEmailOtpType(type)) {
    return redirectToLogin(origin, 'Invalid or expired email confirmation link.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.session) {
    return redirectToLogin(origin, error?.message ?? 'Unable to verify your email.')
  }

  const finalization = await finalizeAuthenticatedUser({
    supabase,
    session: data.session,
    intent,
  })

  if (finalization.needsUpgrade) {
    return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
  }

  const redirectPath = finalization.finalIsHost ? '/my-bookings' : returnTo

  if (phonePrompt) {
    return NextResponse.redirect(
      `${origin}/auth/complete-profile?next=${encodeURIComponent(redirectPath)}`
    )
  }

  return NextResponse.redirect(`${origin}${redirectPath}`)
}
