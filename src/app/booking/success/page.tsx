/**
 * Payment Success Page
 * Displayed after successful Stripe checkout
 */

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faCalendarCheck } from '@fortawesome/free-solid-svg-icons'

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function BookingSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const sessionId = params.session_id

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-secondary-600">
            Your booking has been confirmed and payment has been processed.
          </p>
        </div>

        <div className="bg-secondary-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-secondary-700">
            <FontAwesomeIcon icon={faCalendarCheck} className="text-primary-600" />
            <span>Your reservation is confirmed</span>
          </div>
        </div>

        {sessionId && (
          <p className="text-xs text-secondary-400 mb-6">
            Reference: {sessionId.slice(0, 20)}...
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard/my-bookings"
            className="block w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            View My Bookings
          </Link>
          <Link
            href="/book"
            className="block w-full bg-secondary-100 text-secondary-700 py-3 px-4 rounded-lg font-medium hover:bg-secondary-200 transition-colors"
          >
            Book Another Venue
          </Link>
        </div>
      </div>
    </div>
  )
}
