import type { Metadata } from 'next'
import { findIntentLanding } from '@/lib/seoLandingRoutes'
import { IntentLandingPage } from '@/components/seo/intent-landing-page'

export const revalidate = 600

const ROUTE = findIntentLanding('gym-rental-los-angeles')!

export const metadata: Metadata = {
  title: ROUTE.title,
  description: ROUTE.description,
  alternates: { canonical: ROUTE.path },
  openGraph: {
    title: ROUTE.title,
    description: ROUTE.description,
    url: ROUTE.path,
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: ROUTE.title, description: ROUTE.description },
}

export default async function Page() {
  return <IntentLandingPage route={ROUTE} />
}
