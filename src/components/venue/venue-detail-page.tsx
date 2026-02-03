'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faDollarSign,
  faShield,
  faBolt,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons'
import { AvailabilitySlotsList } from './availability-slots-list'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/layout/navigation'
import type { Venue } from '@/types'

interface VenueDetailPageProps {
  venue: Venue
}

export function VenueDetailPage({ venue }: VenueDetailPageProps) {
  const router = useRouter()

  const primaryPhoto = venue.photos && venue.photos.length > 0 ? venue.photos[0] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-secondary-50/70 to-primary-50">
      <Navigation />

      <div className="px-4 py-6 max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-6 text-secondary-600 hover:text-secondary-800"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back
        </Button>

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden mb-6">
          {/* Photo */}
          {primaryPhoto ? (
            <div className="relative w-full h-64 md:h-96">
              <Image
                src={primaryPhoto}
                alt={venue.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-64 md:h-96 bg-secondary-100 flex items-center justify-center">
              <span className="text-secondary-400 text-lg">No Image Available</span>
            </div>
          )}

          {/* Venue Info */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-secondary-800 mb-4">{venue.name}</h1>

            <div className="space-y-3 mb-6">
              {/* Location */}
              <div className="flex items-center text-secondary-600">
                <FontAwesomeIcon icon={faLocationDot} className="mr-3 text-secondary-500" />
                <span>
                  {venue.address}, {venue.city}, {venue.state} {venue.zip_code}
                </span>
              </div>

              {/* Hourly Rate */}
              <div className="flex items-center text-secondary-600">
                <FontAwesomeIcon icon={faDollarSign} className="mr-3 text-secondary-500" />
                <span className="font-semibold text-secondary-800">${venue.hourly_rate}</span>
                <span className="ml-1">per hour</span>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-4 mt-4">
                {venue.instant_booking && (
                  <div className="flex items-center text-secondary-600">
                    <FontAwesomeIcon icon={faBolt} className="mr-2 text-secondary-500" />
                    <span className="text-sm">Instant Booking</span>
                  </div>
                )}
                {venue.insurance_required && (
                  <div className="flex items-center text-secondary-600">
                    <FontAwesomeIcon icon={faShield} className="mr-2 text-secondary-500" />
                    <span className="text-sm">Insurance Required</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <div className="border-t border-secondary-100 pt-6">
                <h2 className="text-lg font-semibold text-secondary-800 mb-2">About</h2>
                <p className="text-secondary-700 leading-relaxed">{venue.description}</p>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div className="border-t border-secondary-100 pt-6 mt-6">
                <h2 className="text-lg font-semibold text-secondary-800 mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="bg-secondary-100 text-secondary-700 text-sm px-3 py-1 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Availability Section */}
        <AvailabilitySlotsList venue={venue} />
      </div>
    </div>
  )
}

