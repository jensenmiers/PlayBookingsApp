import type { User } from '@supabase/supabase-js'
import { getPostHogClient } from '@/lib/posthog-server'

const GOOGLE_SIGNUP_COMPLETION_WINDOW_MS = 10 * 60 * 1000

type SignupUser = Pick<User, 'id' | 'created_at' | 'app_metadata'>

export async function captureRecentGoogleSignup(args: {
  user: SignupUser
  isHostSignup: boolean
  now?: Date
}): Promise<void> {
  if (args.user.app_metadata?.provider !== 'google') {
    return
  }

  const createdAtMs = Date.parse(args.user.created_at)
  const nowMs = (args.now ?? new Date()).getTime()
  const accountAgeMs = nowMs - createdAtMs

  if (!Number.isFinite(createdAtMs)
    || accountAgeMs < 0
    || accountAgeMs > GOOGLE_SIGNUP_COMPLETION_WINDOW_MS) {
    return
  }

  try {
    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: args.user.id,
      uuid: args.user.id,
      event: 'user_signed_up',
      timestamp: new Date(args.user.created_at),
      properties: {
        method: 'google',
        is_host_signup: args.isHostSignup,
      },
    })
    await posthog.flush()
  } catch {
    // Analytics must never block a successful authentication flow.
    console.error('Failed to capture Google signup analytics')
  }
}
