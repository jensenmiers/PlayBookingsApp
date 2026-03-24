'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faClock } from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'
import { slugify } from '@/lib/utils'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import { PhotoCarousel } from '@/components/venue/photo-carousel'

interface NextAvailableInfo {
  displayText: string  // "Today 3:00 PM" or "Tomorrow 9:00 AM"
  slotId?: string
}

interface VenueCardProps {
  venue: Venue
  /** Optional next available slot info to display as a badge */
  nextAvailable?: NextAvailableInfo | null
}

export function VenueCard({ venue, nextAvailable }: VenueCardProps) {
  const venueSlug = slugify(venue.name)
  const bookingMode = getBookingModeDisplay(venue.instant_booking, 'compact')

  return (
    <Link
      href={`/venue/${venueSlug}`}
      className="group block bg-secondary-800 rounded-2xl shadow-soft overflow-hidden hover:-translate-y-1 hover:shadow-glass active:scale-[0.98] transition-all duration-200"
    >
      {/* Photo area */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-300">
          <PhotoCarousel
            photos={venue.photos || []}
            venueName={venue.name}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {/* Booking mode badge overlay */}
        <span
          className={`absolute top-s right-s z-10 flex items-center gap-xs text-xs px-s py-xs rounded-full ${
            bookingMode.mode === 'instant'
              ? 'bg-accent-400/15 text-accent-400'
              : 'bg-secondary-50/10 text-secondary-50/70'
          }`}
        >
          <FontAwesomeIcon icon={bookingMode.icon} className="text-xs" />
          <span>{bookingMode.label}</span>
        </span>
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
            ${venue.hourly_rate}/hr
          </span>

          {nextAvailable && (
            <span className="inline-flex items-center gap-xs bg-primary-100 text-primary-700 text-xs font-medium px-s py-xxs rounded-full">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              Next: {nextAvailable.displayText}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
