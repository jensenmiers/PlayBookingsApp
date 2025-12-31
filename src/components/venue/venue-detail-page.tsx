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
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { useVenueBySlug } from '@/hooks/useVenues'
import { AvailabilitySlotsList } from './availability-slots-list'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/ui/error-message'
import { Navigation } from '@/components/layout/navigation'

interface VenueDetailPageProps {
  slug: string
}

export function VenueDetailPage({ slug }: VenueDetailPageProps) {
  const router = useRouter()
  const { data: venue, loading, error } = useVenueBySlug(slug)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600 text-4xl mb-4" />
            <p className="text-primary-600">Loading venue details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
        <Navigation />
        <div className="px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mb-6 text-primary-600 hover:text-primary-800"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back
            </Button>
            <ErrorMessage
              error={error || 'Venue not found'}
              title="Unable to load venue"
            />
          </div>
        </div>
      </div>
    )
  }

  const primaryPhoto = venue.photos && venue.photos.length > 0 ? venue.photos[0] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-50/70 to-secondary-50">
      <Navigation />

      <div className="px-4 py-6 max-w-6xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-6 text-primary-600 hover:text-primary-800"
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
            <div className="w-full h-64 md:h-96 bg-primary-100 flex items-center justify-center">
              <span className="text-primary-400 text-lg">No Image Available</span>
            </div>
          )}

          {/* Venue Info */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-primary-800 mb-4">{venue.name}</h1>

            <div className="space-y-3 mb-6">
              {/* Location */}
              <div className="flex items-center text-primary-600">
                <FontAwesomeIcon icon={faLocationDot} className="mr-3 text-primary-500" />
                <span>
                  {venue.address}, {venue.city}, {venue.state} {venue.zip_code}
                </span>
              </div>

              {/* Hourly Rate */}
              <div className="flex items-center text-primary-600">
                <FontAwesomeIcon icon={faDollarSign} className="mr-3 text-primary-500" />
                <span className="font-semibold text-primary-800">${venue.hourly_rate}</span>
                <span className="ml-1">per hour</span>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-4 mt-4">
                {venue.instant_booking && (
                  <div className="flex items-center text-primary-600">
                    <FontAwesomeIcon icon={faBolt} className="mr-2 text-primary-500" />
                    <span className="text-sm">Instant Booking</span>
                  </div>
                )}
                {venue.insurance_required && (
                  <div className="flex items-center text-primary-600">
                    <FontAwesomeIcon icon={faShield} className="mr-2 text-primary-500" />
                    <span className="text-sm">Insurance Required</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {venue.description && (
              <div className="border-t border-primary-100 pt-6">
                <h2 className="text-lg font-semibold text-primary-800 mb-2">About</h2>
                <p className="text-primary-700 leading-relaxed">{venue.description}</p>
              </div>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <div className="border-t border-primary-100 pt-6 mt-6">
                <h2 className="text-lg font-semibold text-primary-800 mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="bg-primary-100 text-primary-700 text-sm px-3 py-1 rounded-full"
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

