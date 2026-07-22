'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faClock } from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'
import { slugify } from '@/lib/utils'
import { PhotoCarousel } from '@/components/venue/photo-carousel'
import { BookingModeChip } from '@/components/venue/shared'
import { deriveVenuePhotos } from '@/lib/venueMedia'
import type { NextAvailableSlot } from '@/lib/venueDiscovery'
import { formatDiscoveryPrice, isOpenGymDiscovery } from '@/lib/discoveryPresentation'

interface VenueCardProps {
  venue: Venue
  /** Optional next available slot info to display as a badge */
  nextAvailable?: NextAvailableSlot | null
}

export function VenueCard({ venue, nextAvailable }: VenueCardProps) {
  const venueSlug = slugify(venue.name)
  const photos = deriveVenuePhotos(venue)
  const isOpenGym = isOpenGymDiscovery(nextAvailable || null)
  const priceLabel = formatDiscoveryPrice(nextAvailable || null, venue.hourly_rate)

  return (
    <Link
      href={`/venue/${venueSlug}`}
      className="group block bg-secondary-800 rounded-2xl shadow-soft overflow-hidden hover:-translate-y-1 hover:shadow-glass active:scale-[0.98] transition-all duration-200"
    >
      {/* Photo area */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-300">
          <PhotoCarousel
            photos={photos}
            venueName={venue.name}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* Booking mode badge overlay */}
        {isOpenGym ? (
          <span className="absolute right-s top-s z-10 rounded-full border border-accent-400/30 bg-accent-400/15 px-s py-xs text-xs font-medium text-accent-400">
            Open Gym
          </span>
        ) : (
          <BookingModeChip
            instantBooking={venue.instant_booking}
            bookingMode={venue.booking_mode}
            className="absolute right-s top-s z-10"
          />
        )}
      </div>

      {/* Content area */}
      <div className="p-m space-y-xs">
        <h3 className="font-bold text-secondary-50 line-clamp-1">
          {venue.name}
        </h3>

        <p className="text-secondary-50/60 text-sm flex items-center gap-xs">
          <FontAwesomeIcon icon={faLocationDot} className="text-secondary-50/50" />
          {venue.city}, {venue.state}
        </p>

        <div className="flex items-center justify-between pt-xs">
          <span className="text-secondary-50 font-semibold">
            {priceLabel}
          </span>

          {nextAvailable && (
            <span className="inline-flex items-center gap-xs bg-primary-100 text-primary-700 text-xs font-medium px-s py-xxs rounded-full">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              {isOpenGym ? 'Open Gym' : 'Next'}: {nextAvailable.displayText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
