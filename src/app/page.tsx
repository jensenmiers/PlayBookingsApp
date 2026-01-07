'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faLocationDot, faShieldHalved, faUsers } from '@fortawesome/free-solid-svg-icons'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl font-bold text-primary-900 md:text-6xl">
            Book Indoor Courts{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              with Ease
            </span>
          </h1>
          <p className="text-lg text-primary-600 md:text-xl">
            Effortless booking—reserve spaces in just a few clicks. Find the perfect court for your next game, practice, or event.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
              <Link href="/venues">Find a Court</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-xl border-primary-200 bg-white/80 px-10 py-3 text-base text-primary-700 hover:bg-primary-100"
            >
              <Link href="/search">Browse Availability</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-semibold text-primary-900">
            Why Choose Play Bookings?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <FontAwesomeIcon icon={faCalendarDays} className="h-8 w-8" />
                </div>
                <CardTitle>Instant Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Browse available time slots and book instantly. No phone calls, no waiting for callbacks.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-8 w-8" />
                </div>
                <CardTitle>Verified Venues</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Every court is verified with accurate photos and amenities, so you know exactly what you're getting.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <FontAwesomeIcon icon={faUsers} className="h-8 w-8" />
                </div>
                <CardTitle>Find Your Game</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Discover courts near you—whether it's for pickup games, team practices, or private sessions.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <FontAwesomeIcon icon={faLocationDot} className="h-8 w-8" />
                </div>
                <CardTitle>Courts Nearby</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Explore indoor courts across Los Angeles County and throughout Southern California.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-border/40 bg-white/90 p-12 text-center shadow-glass">
          <h2 className="text-3xl font-semibold text-primary-900">
            Ready to Find Your Next Court?
          </h2>
          <p className="text-lg text-primary-600">
            Browse available courts and book your next game in minutes.
          </p>
          <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
            <Link href="/search">Start Searching</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
