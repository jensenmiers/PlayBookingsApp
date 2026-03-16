export type AuthIntent = 'host' | null

export const DEFAULT_REDIRECT_RETURN_TO = '/search'

export function sanitizeAuthIntent(intent: string | null | undefined): AuthIntent {
  return intent === 'host' ? 'host' : null
}

export function sanitizeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) {
    return DEFAULT_REDIRECT_RETURN_TO
  }

  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo
  }

  return DEFAULT_REDIRECT_RETURN_TO
}

export function getAuthCallbackPath(stateNonce: string): string {
  return `/auth/callback/${stateNonce}`
}

export function buildAuthInitiationPath(args: {
  returnTo?: string | null
  intent?: string | null
}): string {
  const params = new URLSearchParams()

  if (args.returnTo) {
    params.set('returnTo', args.returnTo)
  }

  const intent = sanitizeAuthIntent(args.intent)
  if (intent) {
    params.set('intent', intent)
  }

  const query = params.toString()
  return query ? `/api/auth/redirect-oauth?${query}` : '/api/auth/redirect-oauth'
}

export function buildEmailEntryPath(args: {
  returnTo?: string | null
  intent?: string | null
}): string {
  const intent = sanitizeAuthIntent(args.intent)
  const basePath = intent === 'host' ? '/auth/register' : '/auth/login'
  const params = new URLSearchParams()

  if (args.returnTo) {
    params.set('returnTo', args.returnTo)
  }

  if (intent) {
    params.set('intent', intent)
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function buildFinalizePath(args: {
  returnTo?: string | null
  intent?: string | null
}): string {
  const params = new URLSearchParams()

  if (args.returnTo) {
    params.set('returnTo', args.returnTo)
  }

  const intent = sanitizeAuthIntent(args.intent)
  if (intent) {
    params.set('intent', intent)
  }

  const query = params.toString()
  return query ? `/auth/finalize?${query}` : '/auth/finalize'
}

export function buildEmailConfirmationPath(args?: {
  next?: string | null
  intent?: string | null
  phonePrompt?: boolean
}): string {
  const params = new URLSearchParams()

  if (args?.next) {
    params.set('next', sanitizeReturnTo(args.next))
  }

  const intent = sanitizeAuthIntent(args?.intent)
  if (intent) {
    params.set('intent', intent)
  }

  if (args?.phonePrompt) {
    params.set('phonePrompt', '1')
  }

  const query = params.toString()
  return query ? `/auth/confirm?${query}` : '/auth/confirm'
}
