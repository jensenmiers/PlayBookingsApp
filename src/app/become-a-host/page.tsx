'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/navigation'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDollarSign, faChartLine, faShieldHalved, faClock, faUsers, faCalendarCheck } from '@fortawesome/free-solid-svg-icons'

export default function BecomeAHostPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl font-bold text-primary-900 md:text-6xl">
            Turn Your Court Into{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Passive Income
            </span>
          </h1>
          <p className="text-lg text-primary-600 md:text-xl">
            List your basketball court or sports facility on Play Bookings and start earning revenue from bookings. 
            We handle the scheduling, payments, and customer management so you can focus on what matters.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
              <Link href="/auth/register?intent=host">Get Started as a Host</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-xl border-primary-200 bg-white/80 px-10 py-3 text-base text-primary-700 hover:bg-primary-100"
            >
              <Link href="/venues">Browse Courts</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-semibold text-primary-900">
            Why List Your Court on Play Bookings?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                  <FontAwesomeIcon icon={faDollarSign} className="h-8 w-8" />
                </div>
                <CardTitle>Generate Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Monetize your unused court time. Set your own pricing and availability to maximize your earnings.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <FontAwesomeIcon icon={faChartLine} className="h-8 w-8" />
                </div>
                <CardTitle>Easy Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Our intuitive dashboard makes it simple to manage bookings, view earnings, and track your court&apos;s performance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-8 w-8" />
                </div>
                <CardTitle>Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Automatic payment processing with secure transactions. Get paid on time, every time.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <FontAwesomeIcon icon={faClock} className="h-8 w-8" />
                </div>
                <CardTitle>Save Time</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Automate your booking process. No more phone calls, emails, or manual scheduling headaches.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                  <FontAwesomeIcon icon={faUsers} className="h-8 w-8" />
                </div>
                <CardTitle>Vetted Renters</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Connect with trusted renters including athletic directors, league coordinators, and club sports managers.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white/95 p-6 shadow-soft">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                  <FontAwesomeIcon icon={faCalendarCheck} className="h-8 w-8" />
                </div>
                <CardTitle>Flexible Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-primary-600">
                  Control when your court is available. Block out times for your own use and set recurring availability.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-16 text-center text-3xl font-semibold text-primary-900">
            How It Works
          </h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-600 text-lg font-bold text-white">
                1
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-primary-900">Sign Up & List Your Court</h3>
                <p className="text-primary-600">
                  Create your account and add your court details. Upload photos, set pricing, and define your availability.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-600 text-lg font-bold text-white">
                2
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-primary-900">Get Bookings</h3>
                <p className="text-primary-600">
                  Renters discover and book your court through our platform. You&apos;ll receive notifications for new bookings.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-600 text-lg font-bold text-white">
                3
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-primary-900">Get Paid</h3>
                <p className="text-primary-600">
                  Payments are processed automatically. View your earnings, manage payouts, and track your revenue all in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-border/40 bg-white/90 p-12 text-center shadow-glass">
          <h2 className="text-3xl font-semibold text-primary-900">
            Ready to Start Earning?
          </h2>
          <p className="text-lg text-primary-600">
            Join Play Bookings today and turn your court into a revenue stream. Setup takes just minutes.
          </p>
          <Button asChild size="lg" className="rounded-xl bg-secondary-600 px-10 py-3 text-base hover:bg-secondary-700">
            <Link href="/auth/register?intent=host">Become a Host</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

