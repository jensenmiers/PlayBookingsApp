'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { CaptureResult } from 'posthog-js'
import { PostHogProvider as PostHogReactProvider } from 'posthog-js/react'
import {
  getDeviceTrafficOverride,
  getUrlTrafficOverride,
  INTERNAL_TRAFFIC_DEVICE_FLAG_KEY,
} from '@/lib/analytics/internalTraffic'

interface PostHogProviderProps {
  children: ReactNode
}

function isInternalTrafficEvent(event: CaptureResult | null): boolean {
  if (!event) {
    return false
  }

  const properties = event.properties as Record<string, unknown> | undefined

  return properties?.is_internal_traffic === true
}

function resolveDeviceOverride(): 'internal' | 'external' | null {
  try {
    const urlOverride = getUrlTrafficOverride(window.location.search)

    if (urlOverride) {
      window.localStorage.setItem(INTERNAL_TRAFFIC_DEVICE_FLAG_KEY, urlOverride)
      return urlOverride
    }

    return getDeviceTrafficOverride(window.localStorage.getItem(INTERNAL_TRAFFIC_DEVICE_FLAG_KEY))
  } catch {
    return null
  }
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  const options = useMemo(
    () => ({
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only' as const,
      before_send: (event: CaptureResult | null) => {
        if (isInternalTrafficEvent(event)) {
          return null
        }

        return event
      },
      loaded: (posthog: {
        register: (properties: Record<string, unknown>) => void
        opt_in_capturing: () => void
        opt_out_capturing: () => void
      }) => {
        const deviceOverride = resolveDeviceOverride()

        if (deviceOverride === 'internal') {
          posthog.register({
            is_internal_traffic: true,
            internal_traffic_source: 'device_override',
          })
          posthog.opt_out_capturing()
          return
        }

        if (deviceOverride === 'external') {
          posthog.register({
            is_internal_traffic: false,
            internal_traffic_source: 'device_override',
          })
          posthog.opt_in_capturing()
        }
      },
    }),
    [],
  )

  if (!posthogApiKey) {
    return <>{children}</>
  }

  return (
    <PostHogReactProvider apiKey={posthogApiKey} options={options}>
      {children}
    </PostHogReactProvider>
  )
}
