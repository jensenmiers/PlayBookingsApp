'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookingList } from '@/components/bookings/booking-list'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function BookingsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { user, loading: userLoading } = useCurrentUser()
  const searchParams = useSearchParams()
  
  // Get the view from URL query param, default based on user role
  const viewParam = searchParams.get('view') as 'renter' | 'host' | null
  const defaultTab = viewParam || (user?.is_venue_owner ? 'host' : 'renter')

  // Determine if user can see host tab
  const showHostTab = user?.is_venue_owner

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary-800">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage and view all your bookings.
          </p>
        </div>
        {user?.is_renter && (
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
      ) : showHostTab ? (
        // Show tabs for users who are both renters and hosts
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="renter">My Reservations</TabsTrigger>
            <TabsTrigger value="host">Incoming Bookings</TabsTrigger>
          </TabsList>
          <TabsContent value="renter" className="mt-6">
            <BookingList initialFilters={{ role_view: 'renter' }} />
          </TabsContent>
          <TabsContent value="host" className="mt-6">
            <BookingList initialFilters={{ role_view: 'host' }} />
          </TabsContent>
        </Tabs>
      ) : (
        // For renters only, show their bookings directly
        <BookingList initialFilters={{ role_view: 'renter' }} />
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



