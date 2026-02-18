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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-secondary-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-50/5 rounded-full mb-4">
            <FontAwesomeIcon icon={faTimesCircle} className="text-secondary-50/50 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-secondary-50 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-secondary-50/60">
            Your payment was cancelled. Your booking is still pending and the time slot is reserved for you.
          </p>
        </div>

        <div className="bg-amber-400/15 border border-secondary-50/10 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-400">
            You can complete your payment anytime from your bookings dashboard to confirm your reservation.
          </p>
        </div>

        <div className="space-y-3">
          {bookingId && (
            <Link
              href={`/dashboard/my-bookings/${bookingId}`}
              className="block w-full bg-primary-400 text-secondary-900 py-3 px-4 rounded-lg font-medium hover:bg-primary-500 transition-colors"
            >
              Complete Payment
            </Link>
          )}
          <Link
            href="/dashboard/my-bookings"
            className="block w-full bg-secondary-50/5 text-secondary-50/70 py-3 px-4 rounded-lg font-medium hover:bg-secondary-50/10 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            View My Bookings
          </Link>
          <Link
            href="/book"
            className="block w-full text-secondary-50/50 py-2 px-4 font-medium hover:text-secondary-50/70 transition-colors"
          >
            Browse Venues
          </Link>
        </div>
      </div>
    </div>
  )
}
