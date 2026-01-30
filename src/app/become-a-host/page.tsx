'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/navigation'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRouter } from 'next/navigation'

export default function BecomeAHostPage() {
  const { openAuthModal } = useAuthModal()
  const { user } = useCurrentUser()
  const router = useRouter()

  const handleHostCTA = () => {
    if (user) {
      // User is already authenticated
      if (user.is_venue_owner) {
        // Already a host - go to dashboard
        router.push('/dashboard')
      } else {
        // Renter needs to upgrade to host
        router.push('/auth/upgrade-to-host')
      }
    } else {
      // Not authenticated - open auth modal with host intent
      openAuthModal({ intent: 'host' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-secondary-50/70 to-primary-50">
      <Navigation />

      {/* Hero Section */}
      <section className="px-4 py-16 text-center md:py-24">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="text-4xl font-bold text-secondary-900 md:text-6xl">
            Hosting that feels{' '}
            <span className="bg-gradient-to-r from-secondary-500 to-primary-500 bg-clip-text text-transparent">
              effortless
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-secondary-600 md:text-xl">
            Turn open gym time into reliable revenue—without the back-and-forth. Play Bookings helps you publish availability,
            manage bookings, and get paid.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button 
              size="lg" 
              className="rounded-xl bg-primary-600 px-10 py-3 text-base hover:bg-primary-700"
              onClick={handleHostCTA}
            >
              Get Started as a Host
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-secondary-200 bg-white/80 px-10 py-3 text-base text-secondary-700 hover:bg-secondary-100"
              onClick={() => document.getElementById('how-hosting-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See how hosting works
            </Button>
          </div>
        </div>
      </section>

      {/* Narrative: what it feels like */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <h2 className="text-3xl font-semibold text-secondary-900">What hosting feels like</h2>
            <p className="text-secondary-600">
              You set the rules. Renters find open times. Bookings stay organized. Payments land reliably.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <CardTitle>Stay in control</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-secondary-600">
                  Decide what&apos;s bookable, when. Block off school events, maintenance, or private time—your calendar is the source of truth.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle>Less admin, fewer headaches</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-secondary-600">
                  One place to track requests, confirmed reservations, messages, and changes—no messy email chains or spreadsheets.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>Get paid with confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-secondary-600">
                  Payments run through the platform so you can focus on the facility—not chasing invoices.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-hosting-works" className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-3xl font-semibold text-secondary-900">How hosting works</h2>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                1
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-secondary-900">Create your host account</h3>
                <p className="text-secondary-600">
                  Sign up in minutes. You&apos;ll land in the host dashboard where you can start setting up your listing.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                2
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-secondary-900">Publish availability the way you actually run a facility</h3>
                <p className="text-secondary-600">
                  Add recurring open hours, one-off openings, and blackouts. Your listing reflects real operational constraints.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                3
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-secondary-900">Manage bookings from one dashboard</h3>
                <p className="text-secondary-600">
                  See upcoming reservations, handle changes, and keep communication in one thread per booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-border/40 bg-white/90 px-8 py-10 text-center shadow-glass md:px-12 md:py-12">
          <h2 className="text-3xl font-semibold text-secondary-900">Ready to host your first booking?</h2>
          <p className="text-lg text-secondary-600">Create your host account and start listing your space today.</p>
          <Button 
            size="lg" 
            className="rounded-xl bg-primary-600 px-10 py-3 text-base hover:bg-primary-700"
            onClick={handleHostCTA}
          >
            Become a Host
          </Button>
        </div>
      </section>
    </div>
  )
}
