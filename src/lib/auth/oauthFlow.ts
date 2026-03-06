export type AuthFlowType = 'popup' | 'redirect'
export type AuthIntent = 'host' | null

export const DEFAULT_REDIRECT_RETURN_TO = '/search'
export const DEFAULT_POPUP_RETURN_TO = '/'

export function sanitizeAuthIntent(intent: string | null | undefined): AuthIntent {
  return intent === 'host' ? 'host' : null
}

export function sanitizeReturnTo(
  returnTo: string | null | undefined,
  flowType: AuthFlowType
): string {
  const defaultPath = flowType === 'redirect'
    ? DEFAULT_REDIRECT_RETURN_TO
    : DEFAULT_POPUP_RETURN_TO

  if (!returnTo) {
    return defaultPath
  }

  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo
  }

  return defaultPath
}

export function getAuthCallbackPath(args: {
  flowType: AuthFlowType
  stateNonce: string
}): string {
  if (args.flowType === 'popup') {
    return `/auth/popup-callback/${args.stateNonce}`
  }

  return `/auth/callback/${args.stateNonce}`
}

export function buildAuthInitiationPath(args: {
  flowType: AuthFlowType
  returnTo?: string | null
  intent?: string | null
}): string {
  const basePath = args.flowType === 'popup'
    ? '/api/auth/popup-oauth'
    : '/api/auth/redirect-oauth'

  const params = new URLSearchParams()
  if (args.returnTo) {
    params.set('returnTo', args.returnTo)
  }

  const intent = sanitizeAuthIntent(args.intent)
  if (intent) {
    params.set('intent', intent)
  }

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}
