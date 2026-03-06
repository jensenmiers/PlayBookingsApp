import { createClient } from '@/lib/supabase/server'
import { getAuthCallbackPath } from '@/lib/auth/oauthFlow'
import { createAuthOAuthState } from '@/services/authOAuthStateService'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const returnTo = searchParams.get('returnTo')
  const intent = searchParams.get('intent')
  const origin = request.nextUrl.origin

  const stateNonce = await createAuthOAuthState({
    flowType: 'redirect',
    returnTo,
    intent,
  })
  const callbackUrl = `${origin}${getAuthCallbackPath({
    flowType: 'redirect',
    stateNonce,
  })}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error?.message || 'OAuth failed')}`)
  }

  return NextResponse.redirect(data.url)
}
