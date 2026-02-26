'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
  faClock,
  faSliders,
  faChevronDown,
  faLocationDot,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons'
import { useVenues } from '@/hooks/useVenues'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { VenueCardSkeleton } from '@/components/search/venue-card-skeleton'
import { ErrorMessage } from '@/components/ui/error-message'
import { slugify } from '@/lib/utils'
import Image from 'next/image'

export function VenuesView() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const { data: venues, loading: venuesLoading, error, refetch } = useVenues()

  const handleBookNow = (venueId: string) => {
    setSelectedVenueId(venueId)
    setShowBookingForm(true)
  }

  const nearbyVenues = venues || []

  return (
    <div className="min-h-screen bg-background">
      {/* Search and Filter Section */}
      <section className="px-4 pt-6 pb-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-secondary-50 mb-2">Find a Court</h2>
          <p className="text-secondary-50/60">Discover nearby basketball courts for your next game</p>
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-secondary-50/30" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or gym name"
            className="w-full pl-12 pr-4 py-4 bg-secondary-800 rounded-2xl shadow-soft"
          />
        </div>

        <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-4 py-3 shadow-soft text-secondary-50/70 hover:bg-secondary-50/10">
              <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/60" />
              <span className="whitespace-nowrap">May 26, 2023</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-4 py-3 shadow-soft text-secondary-50/70 hover:bg-secondary-50/10">
              <FontAwesomeIcon icon={faClock} className="text-secondary-50/60" />
              <span className="whitespace-nowrap">7:00 PM</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-1" />
            </Button>
          </div>
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-4 py-3 shadow-soft text-secondary-50/70 hover:bg-secondary-50/10">
              <FontAwesomeIcon icon={faSliders} className="text-secondary-50/60" />
              <span className="whitespace-nowrap">Filters</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Nearby Courts Section */}
      <section className="px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-50">Nearby Courts</h3>
          <span className="text-primary-400 font-medium text-sm cursor-pointer hover:text-primary-400">
            View Map
          </span>
        </div>

        <div className="space-y-4">
          {venuesLoading ? (
            <>
              <VenueCardSkeleton />
              <VenueCardSkeleton />
              <VenueCardSkeleton />
            </>
          ) : error ? (
            <div className="space-y-4">
              <ErrorMessage error={error} title="Failed to load venues" />
              <Button
                onClick={() => refetch()}
                className="w-full bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-3 rounded-xl transition duration-200"
              >
                Try Again
              </Button>
            </div>
          ) : nearbyVenues.length > 0 ? (
            nearbyVenues.map((venue) => {
              const venueSlug = slugify(venue.name)
              return (
                <div key={venue.id} className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden">
                  <div className="flex">
                    <Link
                      href={`/venue/${venueSlug}`}
                      className="w-1/3 h-[120px] relative block cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      {venue.photos && venue.photos.length > 0 ? (
                        <Image
                          src={venue.photos[0]}
                          alt={`${venue.name} basketball court`}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary-50/5 flex items-center justify-center">
                          <span className="text-secondary-50/40 text-xs">No Image</span>
                        </div>
                      )}
                    </Link>
                    <div className="w-2/3 p-4">
                      <div className="flex justify-between items-start mb-1">
                        <Link
                          href={`/venue/${venueSlug}`}
                          className="font-bold text-secondary-50 hover:text-secondary-50/60 transition-colors cursor-pointer"
                        >
                          {venue.name}
                        </Link>
                      </div>
                      <div className="flex items-center text-secondary-50/60 text-sm mb-1">
                        <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-secondary-50/50" />
                        <span>{venue.city}, {venue.state}</span>
                      </div>
                      <div className="flex items-center text-secondary-50/60 text-sm mb-2">
                        <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-secondary-50/50" />
                        <span>${venue.hourly_rate}/hour</span>
                      </div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {venue.instant_booking ? (
                          <span className="rounded-full bg-accent-400/15 px-2 py-1 text-[11px] text-accent-400">Instant</span>
                        ) : (
                          <span className="rounded-full bg-secondary-50/10 px-2 py-1 text-[11px] text-secondary-50/70">Approval</span>
                        )}
                        {venue.insurance_required && (
                          <span className="rounded-full bg-secondary-50/10 px-2 py-1 text-[11px] text-secondary-50/70">
                            Insurance
                          </span>
                        )}
                      </div>
                      {venue.amenities && venue.amenities.length > 0 && (
                        <div className="flex space-x-2 mb-2">
                          {venue.amenities.slice(0, 3).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="bg-secondary-50/5 text-secondary-50/60 text-xs px-2 py-1 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Link
                          href={`/venue/${venueSlug}`}
                          className="flex-1 bg-secondary-800 border border-secondary-50/10 text-secondary-50/70 hover:bg-secondary-50/10 font-medium py-2 text-sm rounded-xl transition duration-200 text-center"
                        >
                          View Details
                        </Link>
                        <Button
                          onClick={() => handleBookNow(venue.id)}
                          className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 text-sm rounded-xl transition duration-200"
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-secondary-50/60">
              No nearby venues available
            </div>
          )}
        </div>

        <Button className="w-full mt-4 bg-secondary-800 border border-secondary-50/10 text-secondary-50/70 font-medium py-3 rounded-xl hover:bg-secondary-50/10 transition duration-200">
          Load More Courts
        </Button>
      </section>

      {/* Recently Viewed Section */}
      <section className="px-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-50">Recently Viewed</h3>
          <span className="text-primary-400 font-medium text-sm cursor-pointer hover:text-primary-400">
            Clear All
          </span>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4">
          <div className="text-center py-8 text-secondary-50/60 w-full">
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
