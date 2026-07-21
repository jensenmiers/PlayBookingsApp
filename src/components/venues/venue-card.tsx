'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faClock } from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'
import { slugify } from '@/lib/utils'
import { PhotoCarousel } from '@/components/venue/photo-carousel'
import { BookingModeChip } from '@/components/venue/shared'
import { deriveVenuePhotos } from '@/lib/venueMedia'
import {
  formatVenueCardPriceLine,
  resolveVenueAccess,
  type VenueAccessFilter,
} from '@/lib/venueAccess'
import { VenueAccessChips } from '@/components/venues/venue-access-chips'

interface NextAvailableInfo {
  displayText: string  // "Fri Feb 20, 6 PM"
  slotId?: string
}

interface VenueCardProps {
  venue: Venue
  /** Optional next available slot info to display as a badge */
  nextAvailable?: NextAvailableInfo | null
  /** Current discovery access segment; controls next-available badge visibility */
  accessFilter?: VenueAccessFilter
}

export function VenueCard({
  venue,
  nextAvailable,
  accessFilter = 'all',
}: VenueCardProps) {
  const venueSlug = slugify(venue.name)
  const photos = deriveVenuePhotos(venue)
  const { offersPrivateRental } = resolveVenueAccess(venue)
  const priceLine = formatVenueCardPriceLine(venue)
  const showNextAvailable = Boolean(nextAvailable) && accessFilter !== 'open_gym'

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

        <VenueAccessChips
          venue={venue}
          className="absolute right-s top-s z-10 justify-end"
        />
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

        {offersPrivateRental && (
          <BookingModeChip
            instantBooking={venue.instant_booking}
            bookingMode={venue.booking_mode}
            className="w-fit"
          />
        )}

        <div className="flex items-center justify-between gap-s pt-xs">
          <span className="text-secondary-50 font-semibold text-sm sm:text-base">
            {priceLine || `$${venue.hourly_rate}/hr`}
          </span>

          {showNextAvailable && nextAvailable && (
            <span className="inline-flex items-center gap-xs bg-primary-100 text-primary-700 text-xs font-medium px-s py-xxs rounded-full shrink-0">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              Next: {nextAvailable.displayText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
