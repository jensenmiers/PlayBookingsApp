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

function redirectToPopupError(origin: string, error: string) {
  return NextResponse.redirect(`${origin}/auth/popup-success?error=${encodeURIComponent(error)}`)
}

export async function GET(request: NextRequest, context: RouteContext) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const origin = request.nextUrl.origin
  const { stateNonce } = await context.params

  if (oauthError) {
    return redirectToPopupError(origin, oauthError)
  }

  if (!code) {
    return redirectToPopupError(origin, 'No code provided')
  }

  const resolvedState = await resolveAuthOAuthState({
    stateNonce,
    expectedFlowType: 'popup',
  })
  if (!resolvedState) {
    return redirectToPopupError(origin, 'Invalid or expired authentication state')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Code exchange failed:', error)
    return redirectToPopupError(origin, error.message)
  }

  if (data.session) {
    await finalizeAuthenticatedUser({
      supabase,
      session: data.session,
      intent: resolvedState.intent,
    })
  }

  await markAuthOAuthStateUsed(stateNonce)
  return NextResponse.redirect(`${origin}/auth/popup-success`)
}
