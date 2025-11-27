'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
  faClock,
  faSliders,
  faChevronDown,
  faStar,
  faLocationDot,
  faDollarSign,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons'
import { useVenues } from '@/hooks/useVenues'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { VenueCardSkeleton } from '@/components/book/venue-card-skeleton'
import { ErrorMessage } from '@/components/ui/error-message'
import Image from 'next/image'
import type { Venue } from '@/types'

// Mock data - commented out, using database data instead
// const featuredCourts = [...]
// const nearbyCourts = [...]
// const recentlyViewed = [...]

export function VenuesView() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const { data: venues, loading: venuesLoading, error, refetch } = useVenues()

  const handleBookNow = (venueId: string) => {
    setSelectedVenueId(venueId)
    setShowBookingForm(true)
  }

  // Show all venues from database - pagination will be added later
  const nearbyVenues = venues || []

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Search and Filter Section */}
      <section className="px-4 pt-6 pb-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-primary-800 mb-2">Find a Court</h2>
          <p className="text-primary-600">Discover nearby basketball courts for your next game</p>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-primary-300" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or gym name"
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-soft"
          />
        </div>

        <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faCalendarDays} className="text-primary-600" />
              <span className="whitespace-nowrap">May 26, 2023</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faClock} className="text-primary-600" />
              <span className="whitespace-nowrap">7:00 PM</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-white rounded-xl px-4 py-3 shadow-soft text-primary-700 hover:bg-primary-50">
              <FontAwesomeIcon icon={faSliders} className="text-primary-600" />
              <span className="whitespace-nowrap">Filters</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Courts Section - COMMENTED OUT FOR NOW
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Featured Courts</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            View All
          </span>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4">
          {venuesLoading ? (
            <div className="flex items-center justify-center w-full py-8">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" size="2x" />
            </div>
          ) : featuredVenues.length > 0 ? (
            featuredVenues.map((venue) => (
              <div
                key={venue.id}
                className="flex-shrink-0 w-[280px] bg-white rounded-2xl shadow-soft overflow-hidden"
              >
                <div className="relative h-[160px]">
                  {venue.photos && venue.photos.length > 0 ? (
                    <Image
                      src={venue.photos[0]}
                      alt={`${venue.name} basketball court`}
                      fill
                      className="object-cover"
                      sizes="280px"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-400">No Image</span>
                    </div>
                  )}
                  {venue.instant_booking && (
                    <div className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Instant Booking
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-white bg-opacity-90 rounded-lg px-2 py-1 text-xs font-medium text-primary-800">
                    ${venue.hourly_rate}/hour
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-primary-800">{venue.name}</h4>
                  </div>
                  <div className="flex items-center text-primary-600 text-sm mb-2">
                    <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-primary-500" />
                    <span>{venue.city}, {venue.state}</span>
                  </div>
                  <div className="flex items-center text-primary-600 text-sm mb-3">
                    <FontAwesomeIcon icon={faClockRegular} className="mr-2 text-primary-500" />
                    <span>Available</span>
                  </div>
                  <Button
                    onClick={() => handleBookNow(venue.id)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition duration-200"
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-8 text-center text-primary-600">
              No featured venues available
            </div>
          )}
        </div>
      </section>
      */}

      {/* Nearby Courts Section */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Nearby Courts</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            View Map
          </span>
        </div>

        <div className="space-y-4">
          {venuesLoading ? (
            // Show skeleton loading cards
            <>
              <VenueCardSkeleton />
              <VenueCardSkeleton />
              <VenueCardSkeleton />
            </>
          ) : error ? (
            // Show error state with retry button
            <div className="space-y-4">
              <ErrorMessage error={error} title="Failed to load venues" />
              <Button
                onClick={() => refetch()}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition duration-200"
              >
                Try Again
              </Button>
            </div>
          ) : nearbyVenues.length > 0 ? (
            // Show venue cards
            nearbyVenues.map((venue) => (
              <div key={venue.id} className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <div className="flex">
                  <div className="w-1/3 h-[120px] relative">
                    {venue.photos && venue.photos.length > 0 ? (
                      <Image
                        src={venue.photos[0]}
                        alt={`${venue.name} basketball court`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-400 text-xs">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="w-2/3 p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-primary-800">{venue.name}</h4>
                    </div>
                    <div className="flex items-center text-primary-600 text-sm mb-1">
                      <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-primary-500" />
                      <span>{venue.city}, {venue.state}</span>
                    </div>
                    <div className="flex items-center text-primary-600 text-sm mb-2">
                      <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-primary-500" />
                      <span>${venue.hourly_rate}/hour</span>
                    </div>
                    {venue.amenities && venue.amenities.length > 0 && (
                      <div className="flex space-x-2 mb-2">
                        {venue.amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="bg-primary-100 text-primary-600 text-xs px-2 py-1 rounded-full"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={() => handleBookNow(venue.id)}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 text-sm rounded-xl transition duration-200"
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-primary-600">
              No nearby venues available
            </div>
          )}
        </div>

        <Button className="w-full mt-4 bg-white border border-primary-300 text-primary-700 font-medium py-3 rounded-xl hover:bg-primary-50 transition duration-200">
          Load More Courts
        </Button>
      </section>

      {/* Recently Viewed Section */}
      <section className="px-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary-800">Recently Viewed</h3>
          <span className="text-secondary-600 font-medium text-sm cursor-pointer hover:text-secondary-700">
            Clear All
          </span>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4">
          {/* Recently viewed could be implemented with localStorage or user preferences */}
          <div className="text-center py-8 text-primary-600 w-full">
            No recently viewed venues
          </div>
        </div>
      </section>

      {/* Booking Form Dialog */}
      {showBookingForm && selectedVenueId && (
        <CreateBookingForm
          venueId={selectedVenueId}
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          onSuccess={() => {
            setShowBookingForm(false)
            setSelectedVenueId(null)
          }}
        />
      )}
    </div>
  )
}

