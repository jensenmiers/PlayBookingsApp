'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLocationDot,
  faDollarSign,
  faBolt,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'
import { slugify } from '@/lib/utils'

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
  const descriptionPreview = venue.description
    ? venue.description.length > 120
      ? `${venue.description.substring(0, 120)}...`
      : venue.description
    : ''

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
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
            <div className="w-full h-full bg-secondary-100 flex items-center justify-center">
              <span className="text-secondary-400 text-xs">No Image</span>
            </div>
          )}
        </Link>

        {/* Content - right 2/3 */}
        <div className="w-2/3 p-4 flex flex-col">
          {/* Header with name and instant booking badge */}
          <div className="flex justify-between items-start mb-1">
            <Link
              href={`/venue/${venueSlug}`}
              className="font-bold text-secondary-800 hover:text-secondary-600 transition-colors cursor-pointer line-clamp-1"
            >
              {venue.name}
            </Link>
            {venue.instant_booking && (
              <span className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2">
                <FontAwesomeIcon icon={faBolt} className="text-xs" />
                <span>Instant</span>
              </span>
            )}
          </div>

          {/* Description preview - truncated to 2 lines */}
          {descriptionPreview && (
            <p className="text-secondary-600 text-sm mb-2 line-clamp-2">
              {descriptionPreview}
            </p>
          )}

          {/* Location */}
          <div className="flex items-center text-secondary-600 text-sm mb-1">
            <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-secondary-500" />
            <span>
              {venue.city}, {venue.state}
            </span>
          </div>

          {/* Next Available Badge */}
          {nextAvailable && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                Next: {nextAvailable.displayText}
              </span>
            </div>
          )}

          {/* Hourly rate */}
          <div className="flex items-center text-secondary-600 text-sm mb-2">
            <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-secondary-500" />
            <span className="font-medium">${venue.hourly_rate}/hour</span>
          </div>

          {/* Amenities - first 3-4 tags */}
          {venue.amenities && venue.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {venue.amenities.slice(0, 4).map((amenity, idx) => (
                <span
                  key={idx}
                  className="bg-secondary-100 text-secondary-600 text-xs px-2 py-1 rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="flex gap-2 mt-auto">
            <Link
              href={`/venue/${venueSlug}`}
              className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 text-sm rounded-xl transition duration-200 text-center"
            >
              View Details & Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

