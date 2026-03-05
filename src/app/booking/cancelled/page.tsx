/**
 * Payment Cancelled Page
 * Displayed when user cancels or abandons Stripe checkout
 */

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimesCircle, faArrowLeft } from '@fortawesome/free-solid-svg-icons'

interface CancelledPageProps {
  searchParams: Promise<{ booking_id?: string }>
}

export default async function BookingCancelledPage({ searchParams }: CancelledPageProps) {
  const params = await searchParams
  const bookingId = params.booking_id

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-l">
      <div className="max-w-md w-full bg-secondary-800 rounded-2xl shadow-lg p-2xl text-center">
        <div className="mb-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-50/5 rounded-full mb-l">
            <FontAwesomeIcon icon={faTimesCircle} className="text-secondary-50/50 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-secondary-50 mb-s">
            Payment Cancelled
          </h1>
          <p className="text-secondary-50/60">
            Your payment was cancelled. Your booking is still pending and the time slot is reserved for you.
          </p>
        </div>

        <div className="bg-accent-400/15 border border-secondary-50/10 rounded-lg p-l mb-xl">
          <p className="text-sm text-accent-400">
            You can complete your payment anytime from your bookings dashboard to confirm your reservation.
          </p>
        </div>

        <div className="space-y-3">
          {bookingId && (
            <Link
              href={`/my-bookings/${bookingId}`}
              className="block w-full bg-primary-400 text-secondary-900 py-m px-l rounded-lg font-medium hover:bg-primary-500 transition-colors"
            >
              Complete Payment
            </Link>
          )}
          <Link
            href="/my-bookings"
            className="block w-full bg-secondary-50/5 text-secondary-50/70 py-m px-l rounded-lg font-medium hover:bg-secondary-50/10 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-s" />
            View My Bookings
          </Link>
          <Link
            href="/search"
            className="block w-full text-secondary-50/50 py-s px-l font-medium hover:text-secondary-50/70 transition-colors"
          >
            Browse Venues
          </Link>
        </div>
      </div>
    </div>
  )
}
