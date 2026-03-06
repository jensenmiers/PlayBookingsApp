import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sanitizeAuthIntent,
  sanitizeReturnTo,
  type AuthFlowType,
  type AuthIntent,
} from '@/lib/auth/oauthFlow'

const AUTH_OAUTH_STATE_TTL_MS = 10 * 60 * 1000

interface AuthOAuthStateRow {
  state_nonce: string
  flow_type: string
  return_to: string | null
  intent: string | null
  expires_at: string
  used_at: string | null
}

export async function createAuthOAuthState(args: {
  flowType: AuthFlowType
  returnTo: string | null
  intent: string | null
}): Promise<string> {
  const adminClient = createAdminClient()
  const stateNonce = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + AUTH_OAUTH_STATE_TTL_MS).toISOString()

  const { error } = await adminClient
    .from('auth_oauth_states')
    .insert({
      state_nonce: stateNonce,
      flow_type: args.flowType,
      return_to: sanitizeReturnTo(args.returnTo, args.flowType),
      intent: sanitizeAuthIntent(args.intent),
      expires_at: expiresAt,
    })

  if (error) {
    throw new Error(`Failed to persist auth OAuth state: ${error.message}`)
  }

  return stateNonce
}

async function getAuthOAuthState(stateNonce: string): Promise<AuthOAuthStateRow | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('auth_oauth_states')
    .select('state_nonce, flow_type, return_to, intent, expires_at, used_at')
    .eq('state_nonce', stateNonce)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load auth OAuth state: ${error.message}`)
  }

  return (data as AuthOAuthStateRow | null) || null
}

export async function resolveAuthOAuthState(args: {
  stateNonce: string
  expectedFlowType: AuthFlowType
}): Promise<{
  flowType: AuthFlowType
  returnTo: string
  intent: AuthIntent
} | null> {
  const stateRecord = await getAuthOAuthState(args.stateNonce)
  if (!stateRecord) {
    return null
  }

  const flowType = stateRecord.flow_type === 'popup' || stateRecord.flow_type === 'redirect'
    ? stateRecord.flow_type
    : null
  if (!flowType || flowType !== args.expectedFlowType) {
    return null
  }

  const isExpired = new Date(stateRecord.expires_at).getTime() < Date.now()
  if (stateRecord.used_at || isExpired) {
    return null
  }

  return {
    flowType,
    returnTo: sanitizeReturnTo(stateRecord.return_to, flowType),
    intent: sanitizeAuthIntent(stateRecord.intent),
  }
}

export async function markAuthOAuthStateUsed(stateNonce: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('auth_oauth_states')
    .update({
      used_at: new Date().toISOString(),
    })
    .eq('state_nonce', stateNonce)
    .is('used_at', null)

  if (error) {
    throw new Error(`Failed to mark auth OAuth state as used: ${error.message}`)
  }
}
