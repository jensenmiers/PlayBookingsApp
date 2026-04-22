import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/venueSeo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard',
          '/listings',
          '/messages',
          '/payouts',
          '/settings',
          '/my-bookings',
          '/book/',
          '/booking/',
          '/venue/*/1',
          '/venue/*/2',
          '/venue/*/3',
        ],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
