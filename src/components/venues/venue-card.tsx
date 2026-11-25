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
import {
  formatVenueCardPriceLine,
  resolveVenueAccess,
  type VenueAccessFilter,
} from '@/lib/venueAccess'
import { VenueAccessChips } from '@/components/venues/venue-access-chips'

interface VenueCardProps {
  venue: Venue
  /** Optional next available slot info to display as a badge */
  nextAvailable?: NextAvailableSlot | null
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
  const isOpenGym = isOpenGymDiscovery(nextAvailable || null)
  const { offersPrivateRental } = resolveVenueAccess(venue)
  const priceLine = formatVenueCardPriceLine(venue)
  const discoveryPrice = formatDiscoveryPrice(nextAvailable || null, venue.hourly_rate)
  const displayedPrice = isOpenGym ? discoveryPrice : priceLine
  const showNextAvailable = Boolean(nextAvailable) && accessFilter !== 'open_gym'
  const accessChipVenue = isOpenGym
    ? { ...venue, offers_open_gym: true }
    : venue

  return (
    <Link
      href={`/venue/${venueSlug}`}
      className="group block bg-secondary-800 rounded-2xl shadow-soft overflow-hidden hover:-translate-y-1 hover:shadow-glass active:scale-[0.98] transition-all duration-200"
    >
      {/* Photo area */}
      <div
        data-slot="venue-card-photo"
        className="relative aspect-[4/3] overflow-hidden"
      >
        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-300">
          <PhotoCarousel
            photos={photos}
            venueName={venue.name}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            indicatorAlignment="left"
          />
        </div>

        <VenueAccessChips
          venue={accessChipVenue}
          className="absolute left-l right-l top-l z-10 justify-start"
        />

        {displayedPrice && (
          <span
            data-slot="venue-card-price"
            className="pointer-events-none absolute bottom-l right-l z-10 max-w-3/4 rounded-full bg-secondary-900/75 px-m py-xs text-right text-sm font-semibold leading-tight text-secondary-50 backdrop-blur-md"
          >
            {displayedPrice}
          </span>
        )}
      </div>

      {/* Content area */}
      <div data-slot="venue-card-content" className="p-m space-y-xs">
        <h3 className="font-bold text-secondary-50 line-clamp-1">
          {venue.name}
        </h3>

        <p className="text-secondary-50/60 text-sm flex items-center gap-xs">
          <FontAwesomeIcon icon={faLocationDot} className="text-secondary-50/50" />
          {venue.city}, {venue.state}
        </p>

        {offersPrivateRental && !isOpenGym && (
          <BookingModeChip
            instantBooking={venue.instant_booking}
            bookingMode={venue.booking_mode}
            className="w-fit"
          />
        )}

        <div className="flex min-h-xl items-center justify-end pt-xs">
          {showNextAvailable && nextAvailable && (
            <span className="inline-flex items-center gap-xs bg-primary-100 text-primary-700 text-xs font-medium px-s py-xxs rounded-full shrink-0">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              {isOpenGym ? 'Open Gym' : 'Next'}: {nextAvailable.displayText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
