import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const isPopup = searchParams.get('popup') === 'true'
  const returnTo = searchParams.get('returnTo') || '/search'
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
    const user = data.session.user
    const isHostSignup = intent === 'host'

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, is_venue_owner')
      .eq('id', user.id)
      .single()

    const needsUpgrade = existingUser && !fetchError && isHostSignup && !existingUser.is_venue_owner

    if (!needsUpgrade) {
      const fullName = user.user_metadata?.full_name || ''
      const [firstName, ...lastNameParts] = fullName.split(' ')

      await supabase.from('users').upsert(
        {
          id: user.id,
          email: user.email,
          first_name: firstName || null,
          last_name: lastNameParts.join(' ') || null,
          is_renter: true,
          is_venue_owner: existingUser?.is_venue_owner ?? isHostSignup,
          is_admin: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    }

    if (needsUpgrade) {
      return NextResponse.redirect(`${origin}/auth/upgrade-to-host`)
    }

    const finalIsHost = existingUser?.is_venue_owner ?? isHostSignup
    const redirectPath = finalIsHost ? '/dashboard' : returnTo
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
