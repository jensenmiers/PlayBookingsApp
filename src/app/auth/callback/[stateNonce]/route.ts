import { createClient } from '@/lib/supabase/server'
import { finalizeAuthenticatedUser } from '@/services/authSessionService'
import {
  markAuthOAuthStateUsed,
  resolveAuthOAuthState,
} from '@/services/authOAuthStateService'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = {
  params: Promise<{ stateNonce: string }>
}

function redirectToLoginWithError(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
}

export async function GET(request: NextRequest, context: RouteContext) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin
  const { stateNonce } = await context.params

  if (!code) {
    return redirectToLoginWithError(origin, 'No code provided')
  }

  const resolvedState = await resolveAuthOAuthState({
    stateNonce,
  })
  if (!resolvedState) {
    return redirectToLoginWithError(origin, 'Invalid or expired authentication state')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange failed:', error)
    return redirectToLoginWithError(origin, error.message)
  }

  if (data.session) {
    const finalization = await finalizeAuthenticatedUser({
      supabase,
      session: data.session,
      intent: resolvedState.intent,
    })

    await markAuthOAuthStateUsed(stateNonce)

    if (finalization.needsUpgrade) {
      return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
    }

    return NextResponse.redirect(`${origin}${resolvedState.returnTo}`)
  }

  await markAuthOAuthStateUsed(stateNonce)
  return NextResponse.redirect(`${origin}${resolvedState.returnTo}`)
}
