'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faDollarSign,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'
import { slugify } from '@/lib/utils'
import { getBookingModeDisplay } from '@/lib/booking-mode'

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
  const hasPhoto = venue.photos && venue.photos.length > 0
  const bookingMode = getBookingModeDisplay(venue.instant_booking, 'compact')
  const descriptionPreview = venue.description
    ? venue.description.length > 120
      ? `${venue.description.substring(0, 120)}...`
      : venue.description
    : ''

  return (
    <div className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden">
      <div className="flex">
        {/* Photo - left 1/3 */}
        <Link
          href={`/venue/${venueSlug}`}
          className="w-1/3 h-[140px] relative block cursor-pointer hover:opacity-90 transition-opacity"
        >
          {hasPhoto ? (
            <Image
              src={venue.photos[0]}
              alt={`${venue.name} basketball court`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 140px"
            />
          ) : (
            <div className="w-full h-full bg-secondary-50/5 flex items-center justify-center">
              <span className="text-secondary-50/40 text-xs">No Image</span>
            </div>
          )}
        </Link>

        {/* Content - right 2/3 */}
        <div className="w-2/3 p-l flex flex-col">
          {/* Header with name and booking mode badge */}
          <div className="flex justify-between items-start mb-xs">
            <Link
              href={`/venue/${venueSlug}`}
              className="font-bold text-secondary-50 hover:text-secondary-50/60 transition-colors cursor-pointer line-clamp-1"
            >
              {venue.name}
            </Link>
            <span
              className={`flex items-center gap-xs text-xs px-s py-xs rounded-full whitespace-nowrap ml-s ${
                bookingMode.mode === 'instant'
                  ? 'bg-accent-400/15 text-accent-400'
                  : 'bg-secondary-50/10 text-secondary-50/70'
              }`}
            >
              <FontAwesomeIcon icon={bookingMode.icon} className="text-xs" />
              <span>{bookingMode.label}</span>
            </span>
          </div>

          {/* Description preview - truncated to 2 lines */}
          {descriptionPreview && (
            <p className="text-secondary-50/60 text-sm mb-s line-clamp-2">
              {descriptionPreview}
            </p>
          )}

          {/* Location */}
          <div className="flex items-center text-secondary-50/60 text-sm mb-xs">
            <FontAwesomeIcon icon={faLocationDot} className="mr-s text-secondary-50/50" />
            <span>
              {venue.city}, {venue.state}
            </span>
          </div>

          {/* Next Available Badge */}
          {nextAvailable && (
            <div className="flex items-center gap-s mb-xs">
              <span className="inline-flex items-center gap-xs bg-primary-100 text-primary-700 text-xs font-medium px-s py-xxs rounded-full">
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                Next: {nextAvailable.displayText}
              </span>
            </div>
          )}

          {/* Hourly rate */}
          <div className="flex items-center text-secondary-50/60 text-sm mb-s">
            <FontAwesomeIcon icon={faDollarSign} className="mr-s text-secondary-50/50" />
            <span className="font-medium">${venue.hourly_rate}/hour</span>
          </div>

          {/* Insurance requirement */}
          {venue.insurance_required && (
            <div className="mb-s">
              <span className="rounded-full bg-secondary-50/10 px-s py-xs text-[11px] text-secondary-50/70">
                Insurance
              </span>
            </div>
          )}

          {/* Amenities - first 3-4 tags */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="flex flex-wrap gap-s mb-m">
              {venue.amenities.slice(0, 4).map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-secondary-50/5 text-secondary-50/60 text-xs px-s py-xs rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="flex gap-s mt-auto">
            <Link
              href={`/venue/${venueSlug}`}
              className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-secondary-50 font-medium py-s text-sm rounded-xl transition duration-200 text-center"
            >
              View Details & Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
