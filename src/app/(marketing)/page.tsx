import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faLocationDot, faShieldHalved, faUsers } from '@fortawesome/free-solid-svg-icons'

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl font-bold text-primary-900 md:text-6xl">
            Streamline Your{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Gym Rentals
            </span>
          </h1>
          <p className="text-lg text-primary-600 md:text-xl">
            Connect underutilized indoor basketball courts with trusted renters. Generate revenue, reduce admin work, and strengthen community engagement.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
              <Link href="/auth/register">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-xl border-primary-200 bg-white/80 px-10 py-3 text-base text-primary-700 hover:bg-primary-100"
            >
              <Link href="/venues">Browse</Link>
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
                <CardTitle>Easy Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Manage availability with our intuitive calendar system. Set custom pricing and instant booking options.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-8 w-8" />
                </div>
                <CardTitle>Trust &amp; Safety</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Vetted renters and insurance verification ensure your facility is protected.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <FontAwesomeIcon icon={faUsers} className="h-8 w-8" />
                </div>
                <CardTitle>Community Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Connect with athletic directors, league coordinators, and club sports managers.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 text-center shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <FontAwesomeIcon icon={faLocationDot} className="h-8 w-8" />
                </div>
                <CardTitle>Local Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Focus on Los Angeles County with plans to expand throughout Southern California.
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
            Ready to Transform Your Gym Rental Process?
          </h2>
          <p className="text-lg text-primary-600">
            Join the growing network of venues and renters using Play Bookings.
          </p>
          <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
            <Link href="/auth/register">Start Today</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
