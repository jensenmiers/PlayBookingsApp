'use client'

import { useEffect } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { usePostHog } from 'posthog-js/react'
import { createClient } from '@/lib/supabase/client'
import {
  getDeviceTrafficOverride,
  getInternalTrafficSet,
  INTERNAL_TRAFFIC_DEVICE_FLAG_KEY,
  isInternalEmail,
} from '@/lib/analytics/internalTraffic'

const INTERNAL_EMAILS = getInternalTrafficSet(process.env.NEXT_PUBLIC_POSTHOG_INTERNAL_EMAILS)
const INTERNAL_DOMAINS = getInternalTrafficSet(process.env.NEXT_PUBLIC_POSTHOG_INTERNAL_DOMAINS)

function persistInternalDeviceFlag() {
  try {
    window.localStorage.setItem(INTERNAL_TRAFFIC_DEVICE_FLAG_KEY, 'internal')
  } catch {
    // Ignore storage failures (private mode / blocked storage).
  }
}

function getStoredDeviceOverride() {
  try {
    return getDeviceTrafficOverride(window.localStorage.getItem(INTERNAL_TRAFFIC_DEVICE_FLAG_KEY))
  } catch {
    return null
  }
}

function handleUserIdentification(posthog: ReturnType<typeof usePostHog>, user: SupabaseUser | null) {
  if (!user?.id || !user.email) {
    posthog.unregister('is_internal_traffic')
    posthog.unregister('is_internal_user')
    posthog.unregister('internal_traffic_source')
    return
  }

  const internalUser = isInternalEmail(user.email, INTERNAL_EMAILS, INTERNAL_DOMAINS)

  posthog.identify(user.id, {
    email: user.email,
    is_internal_user: internalUser,
    is_internal_traffic: internalUser,
  })

  posthog.register({
    is_internal_user: internalUser,
    is_internal_traffic: internalUser,
    internal_traffic_source: internalUser ? 'email_or_domain_match' : 'external_user',
  })

  if (internalUser) {
    persistInternalDeviceFlag()
    posthog.opt_out_capturing()
    return
  }

  const deviceOverride = getStoredDeviceOverride()
  if (deviceOverride === 'external') {
    posthog.opt_in_capturing()
  }
}

export function PostHogUserIdentification() {
  const posthog = usePostHog()
  const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  useEffect(() => {
    if (!posthogApiKey) {
      return
    }

    const supabase = createClient()
    let mounted = true

    const identify = (user: SupabaseUser | null) => {
      if (!mounted) return
      handleUserIdentification(posthog, user)
    }

    void supabase.auth.getUser().then(({ data }) => {
      identify(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      identify(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [posthog, posthogApiKey])

  return null
}
