import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getPostHogClient(): PostHog {
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    throw new Error(
      'NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured'
    )
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return { capture: () => undefined, flush: async () => undefined, shutdown: async () => undefined } as unknown as PostHog
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return posthogClient
}
