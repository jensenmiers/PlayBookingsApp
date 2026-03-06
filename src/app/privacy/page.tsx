import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'

const EFFECTIVE_DATE = 'March 6, 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Learn how Play Bookings collects, uses, and protects personal information, including Google user data from Google Sign-In and Google Calendar.',
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Privacy Policy',
    description:
      'Learn how Play Bookings collects, uses, and protects personal information, including Google user data.',
    url: 'https://www.playbookings.com/privacy',
  },
  twitter: {
    title: 'Privacy Policy',
    description:
      'Learn how Play Bookings collects, uses, and protects personal information, including Google user data.',
  },
}

const sections = [
  {
    title: 'Overview',
    content: (
      <>
        <p>
          Play Bookings helps renters find courts and helps hosts manage facility availability and bookings.
          This Privacy Policy explains what information we collect, how we use it, and how Google user data is
          handled inside the product.
        </p>
        <p>
          In short: we use Google Sign-In to authenticate users, and venue admins can optionally connect a
          Google Calendar so Play Bookings can read selected calendar timing and busy information, combine that
          data with venue operating hours, and generate bookable availability windows. We do not sell Google
          user data, and we do not use Google user data for advertising or unrelated product features.
        </p>
      </>
    ),
  },
  {
    title: 'Data Collected',
    content: (
      <>
        <p>Depending on how you use the service, Play Bookings may collect:</p>
        <ul className="list-disc space-y-2 pl-5 text-secondary-50/72">
          <li>Account information such as your name, email address, and profile image.</li>
          <li>Booking, venue, payment, and messaging data needed to operate the marketplace.</li>
          <li>Calendar integration data for hosts who connect Google Calendar.</li>
          <li>Operational and security data such as audit logs, sync status, and error information.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Google Sign-In Data Use',
    content: (
      <>
        <p>
          We use Google via Supabase Auth to authenticate users who choose Google Sign-In. When you sign in with
          Google, Play Bookings uses Google-provided profile information already used by the application,
          including your email address, name or full name, and avatar or profile picture, to create or update
          your account.
        </p>
        <p>
          This information is used to let you access the service, identify your account inside Play Bookings,
          and display basic profile details in the product. We do not use Google Sign-In data for advertising.
        </p>
      </>
    ),
  },
  {
    title: 'Google Calendar Data Use',
    content: (
      <>
        <p>
          Venue admins may choose to connect a Google Calendar to a venue. This access is read-only and is
          requested only when an admin explicitly chooses to connect Google Calendar for that venue.
        </p>
        <p>When a venue admin connects Google Calendar, Play Bookings may:</p>
        <ul className="list-disc space-y-2 pl-5 text-secondary-50/72">
          <li>Store encrypted Google OAuth access and refresh tokens and the granted scopes.</li>
          <li>List the calendars available in the connected Google account.</li>
          <li>Store the connected account email and the selected Google calendar identifier and name.</li>
          <li>
            Read event timing and busy information from the selected Google Calendar so Play Bookings can
            generate bookable availability windows during configured operating hours.
          </li>
          <li>Store limited event-derived metadata needed for sync and availability generation, such as event identifiers, timestamps, status, summary, and the selected calendar identifier.</li>
          <li>Use busy periods from the selected calendar to remove overlapping bookable time during operating hours.</li>
        </ul>
        <p>
          Play Bookings does not write to Google Calendar, create calendar events, edit calendar events, or
          delete calendar events in your Google account.
        </p>
      </>
    ),
  },
  {
    title: 'Sharing and Disclosure',
    content: (
      <>
        <p>
          We may share information with service providers that help us operate Play Bookings, such as
          authentication, hosting, database, analytics, and payment infrastructure providers. We may also
          disclose information when required by law or to protect the security and integrity of the service.
        </p>
        <p>
          Play Bookings does not sell Google user data. We do not use Google user data for advertising or for
          unrelated product features.
        </p>
      </>
    ),
  },
  {
    title: 'Retention',
    content: (
      <>
        <p>
          We retain account and operational data for as long as needed to operate Play Bookings, comply with
          legal obligations, resolve disputes, and enforce our agreements.
        </p>
        <p>
          If a host disconnects Google Calendar, Play Bookings attempts to revoke the refresh token, removes the
          stored calendar tokens from our systems, and stops calendar syncing. Some derived operational records,
          such as availability blocks, sync history, or audit logs, may remain as part of normal platform
          records.
        </p>
      </>
    ),
  },
  {
    title: 'Security',
    content: (
      <>
        <p>
          We use reasonable administrative, technical, and organizational measures to protect information handled
          by Play Bookings. For Google Calendar connections, OAuth tokens are stored in encrypted form at rest.
        </p>
        <p>
          No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
        </p>
      </>
    ),
  },
  {
    title: 'User Choices',
    content: (
      <>
        <p>
          You can choose whether to sign in with Google, and hosts can choose whether to connect Google
          Calendar. Hosts can disconnect Google Calendar from the venue settings flow, which revokes or removes
          stored tokens and stops future syncs.
        </p>
        <p>If you need help with privacy or data handling questions, use the contact details listed below.</p>
      </>
    ),
  },
  {
    title: 'Contact',
    content: (
      <p>
        For privacy questions, Google user data requests, or requests related to this policy, email{' '}
        <Link href="mailto:jensen@playbookings.com" className="text-primary-400 transition-colors hover:text-primary-300">
          jensen@playbookings.com
        </Link>
        .
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-secondary-50/10 bg-secondary-800/80 p-8 shadow-glass sm:p-10">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-accent-400">Legal</p>
            <h1 className="font-serif text-4xl text-secondary-50 sm:text-5xl">Privacy Policy</h1>
            <p className="mt-4 max-w-2xl text-base text-secondary-50/70 sm:text-lg">
              This page explains how Play Bookings uses personal information and, specifically, how the
              application handles Google user data for sign-in and host calendar syncing.
            </p>

            <div className="mt-8 rounded-2xl border border-primary-400/20 bg-primary-400/10 p-5 text-sm text-secondary-50/80">
              <p className="font-medium text-secondary-50">Effective date: {EFFECTIVE_DATE}</p>
              <p className="mt-2">
                In short: Google Sign-In helps you access your account, and optional Google Calendar connections
                use read-only calendar data plus venue operating hours to generate accurate bookable availability.
              </p>
            </div>

            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section key={section.title} className="space-y-4 border-t border-secondary-50/10 pt-8 first:border-t-0 first:pt-0">
                  <h2 className="font-serif text-2xl text-secondary-50 sm:text-3xl">{section.title}</h2>
                  <div className="space-y-4 text-sm leading-7 text-secondary-50/72 sm:text-base">{section.content}</div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
