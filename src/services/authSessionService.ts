import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { HOST_ONBOARDING_ENABLED } from '@/lib/hostOnboarding'
import { sanitizeAuthIntent } from '@/lib/auth/oauthFlow'

interface ExistingUserRow {
  id: string
  is_venue_owner: boolean
}

export async function finalizeAuthenticatedUser(args: {
  supabase: SupabaseClient
  session: Session
  intent: string | null
}): Promise<{
  finalIsHost: boolean
  needsUpgrade: boolean
}> {
  const user = args.session.user
  const intent = sanitizeAuthIntent(args.intent)
  const isHostSignup = HOST_ONBOARDING_ENABLED && intent === 'host'

  const { data: existingUser, error: fetchError } = await args.supabase
    .from('users')
    .select('id, is_venue_owner')
    .eq('id', user.id)
    .single()

  const typedExistingUser = (existingUser as ExistingUserRow | null) || null
  const needsUpgrade = Boolean(
    typedExistingUser
    && !fetchError
    && isHostSignup
    && !typedExistingUser.is_venue_owner
  )

  if (!needsUpgrade) {
    const fullName = user.user_metadata?.full_name || ''
    const [firstName, ...lastNameParts] = fullName.split(' ')

    await args.supabase.from('users').upsert(
      {
        id: user.id,
        email: user.email,
        first_name: firstName || null,
        last_name: lastNameParts.join(' ') || null,
        is_renter: true,
        is_venue_owner: typedExistingUser?.is_venue_owner ?? isHostSignup,
        is_admin: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
  }

  return {
    finalIsHost: typedExistingUser?.is_venue_owner ?? isHostSignup,
    needsUpgrade,
  }
}
