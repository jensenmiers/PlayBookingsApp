'use client'

import { useParams, useRouter } from 'next/navigation'
import { BookingDetails } from '@/components/bookings/booking-details'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useCurrentUser()

  const bookingId = params.id as string

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-50/60" size="2x" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/my-bookings')}
        className="text-secondary-50/60 hover:text-secondary-50"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
        Back to My Bookings
      </Button>

      <BookingDetails
        bookingId={bookingId}
        isRenter={user?.is_renter ?? false}
        isVenueOwner={user?.is_venue_owner ?? false}
        isAdmin={user?.is_admin ?? false}
        onActionComplete={() => router.refresh()}
      />
    </div>
  )
}
