'use client'

import { useState } from 'react'
import { BookingList } from '@/components/bookings/booking-list'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function BookingsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { user, loading: userLoading } = useCurrentUser()
  const userRole = user?.role || 'renter' // Default to renter if not loaded

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary-800">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage and view all your bookings.
          </p>
        </div>
        {userRole === 'renter' && (
          <Button onClick={() => setShowCreateForm(true)}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Create Booking
          </Button>
        )}
      </header>

      {userLoading ? (
        <div className="flex items-center justify-center p-8">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" size="2x" />
        </div>
      ) : (
        <BookingList userRole={userRole} />
      )}

      {showCreateForm && (
        <CreateBookingForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSuccess={() => {
            setShowCreateForm(false)
            // Optionally redirect to booking details
            // router.push(`/dashboard/bookings/${bookingId}`)
          }}
        />
      )}
    </div>
  )
}



