export const INTERNAL_TRAFFIC_QUERY_PARAM = 'internal_traffic'
export const INTERNAL_TRAFFIC_DEVICE_FLAG_KEY = 'playbookings_internal_traffic'

type TrafficOverride = 'internal' | 'external'

const INTERNAL_VALUES = new Set(['1', 'true', 'yes', 'internal'])
const EXTERNAL_VALUES = new Set(['0', 'false', 'no', 'external'])

function normalizeOverride(value: string | null | undefined): TrafficOverride | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (INTERNAL_VALUES.has(normalized)) {
    return 'internal'
  }

  if (EXTERNAL_VALUES.has(normalized)) {
    return 'external'
  }

  return null
}

export function getInternalTrafficSet(value: string | undefined): Set<string> {
  if (!value) return new Set()

  return new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isInternalEmail(
  email: string | null | undefined,
  internalEmails: Set<string>,
  internalDomains: Set<string>,
): boolean {
  if (!email) return false

  const normalizedEmail = email.trim().toLowerCase()

  if (internalEmails.has(normalizedEmail)) {
    return true
  }

  const parts = normalizedEmail.split('@')
  if (parts.length !== 2) {
    return false
  }

  return internalDomains.has(parts[1])
}

export function getUrlTrafficOverride(search: string): TrafficOverride | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(query)

  return normalizeOverride(params.get(INTERNAL_TRAFFIC_QUERY_PARAM))
}

export function getDeviceTrafficOverride(value: string | null): TrafficOverride | null {
  return normalizeOverride(value)
}
