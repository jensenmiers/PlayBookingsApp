import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const returnTo = searchParams.get('returnTo') || '/'
  const intent = searchParams.get('intent')

  const callbackParams = new URLSearchParams()
  callbackParams.set('popup', 'true')
  if (returnTo) callbackParams.set('returnTo', returnTo)
  if (intent) callbackParams.set('intent', intent)

  const origin = request.nextUrl.origin
  const callbackUrl = `${origin}/auth/callback?${callbackParams.toString()}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/auth/popup-success?error=${encodeURIComponent(error?.message || 'OAuth failed')}`)
  }

  return NextResponse.redirect(data.url)
}
