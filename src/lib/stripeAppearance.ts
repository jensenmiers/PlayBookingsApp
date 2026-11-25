import type { Appearance, StripeElementsOptions } from '@stripe/stripe-js'

const CAL_SANS_UI_FAMILY = 'Cal Sans UI'

const CAL_SANS_UI_FILES = [
  { weight: '400', file: 'CalSansUI-Regular.woff2' },
  { weight: '500', file: 'CalSansUI-Medium.woff2' },
  { weight: '600', file: 'CalSansUI-SemiBold.woff2' },
  { weight: '700', file: 'CalSansUI-Bold.woff2' },
] as const

function resolveOrigin(origin?: string): string {
  if (origin) return origin.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

/** Shared Stripe Elements appearance so Payment Element matches app typography. */
export function getStripeElementsAppearance(
  variables?: Appearance['variables']
): Appearance {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0066cc',
      fontFamily: `${CAL_SANS_UI_FAMILY}, ui-sans-serif, system-ui, sans-serif`,
      borderRadius: '8px',
      ...variables,
    },
  }
}

export function getStripeElementsFonts(
  origin?: string
): NonNullable<StripeElementsOptions['fonts']> {
  const base = resolveOrigin(origin)

  return CAL_SANS_UI_FILES.map(({ weight, file }) => ({
    family: CAL_SANS_UI_FAMILY,
    src: `url(${base}/fonts/${file})`,
    weight,
  }))
}
