'use client'

import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'

interface TicketHeroProps {
  venue: Venue | null
  onBack: () => void
}

export function TicketHero({ venue, onBack }: TicketHeroProps) {
  const primaryPhoto = venue?.photos?.[0]

  return (
    <div className="relative h-[40vh] sm:h-[45vh] md:h-[50vh] min-h-[280px] -mx-6 lg:-mx-10">
      {/* Photo or gradient fallback */}
      {primaryPhoto ? (
        <Image
          src={primaryPhoto}
          alt={venue?.name || 'Venue'}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 to-secondary-900" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-secondary-900/60 to-transparent" />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-900/50 backdrop-blur-md text-secondary-50/80 hover:text-secondary-50 hover:bg-secondary-900/70 transition-all"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </button>

      {/* Venue name overlay */}
      {venue && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 z-10">
          <h1 className="font-serif text-3xl sm:text-4xl text-secondary-50 leading-tight">
            {venue.name}
          </h1>
          <p className="text-secondary-50/60 text-sm mt-1">
            {venue.city}, {venue.state}
          </p>
        </div>
      )}
    </div>
  )
}
