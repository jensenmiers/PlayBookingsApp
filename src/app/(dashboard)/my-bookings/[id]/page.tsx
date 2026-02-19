'use client'

import { useParams, useRouter } from 'next/navigation'
import { BookingTicket } from '@/components/bookings/ticket/booking-ticket'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

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
    <BookingTicket
      bookingId={bookingId}
      isRenter={user?.is_renter ?? false}
      isVenueOwner={user?.is_venue_owner ?? false}
      isAdmin={user?.is_admin ?? false}
      onActionComplete={() => router.refresh()}
    />
  )
}
