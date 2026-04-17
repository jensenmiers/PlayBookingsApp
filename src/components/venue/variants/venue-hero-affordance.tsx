'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImages, faExpand } from '@fortawesome/free-solid-svg-icons'

interface VenueHeroAffordanceProps {
  photoCount: number
  style: 'pill' | 'cta' | 'expand'
  onOpenGallery?: () => void
}

export function VenueHeroAffordance({ photoCount, style, onOpenGallery }: VenueHeroAffordanceProps) {
  if (photoCount === 0) return null

  if (style === 'pill') {
    return (
      <div className="absolute bottom-28 right-4 z-10 pointer-events-none flex flex-col items-end gap-xs">
        <div className="flex items-center gap-xs bg-secondary-900/70 backdrop-blur-md text-secondary-50 text-xs px-m py-xs rounded-full border border-secondary-50/15">
          <FontAwesomeIcon icon={faImages} className="text-[10px]" />
          <span>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </span>
        </div>
        <span className="text-secondary-50/50 text-[10px] pr-xs">
          Tap to view
        </span>
      </div>
    )
  }

  if (style === 'cta') {
    return (
      <div className="absolute bottom-28 right-4 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenGallery?.()
          }}
          className="flex items-center gap-s bg-secondary-50 text-secondary-900 text-sm font-medium px-l py-s rounded-lg shadow-lg hover:bg-secondary-100 active:scale-95 transition-all"
        >
          <FontAwesomeIcon icon={faImages} className="text-xs" />
          View all photos
        </button>
      </div>
    )
  }

  // style === 'expand'
  return (
    <div className="absolute top-16 right-4 z-10">
      <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenGallery?.()
          }}
          aria-label="Expand photos"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary-900/60 backdrop-blur-md text-secondary-50 border border-secondary-50/20 hover:bg-secondary-900/80 hover:border-secondary-50/40 active:scale-95 transition-all"
        >
          <FontAwesomeIcon icon={faExpand} className="text-sm" />
        </button>
    </div>
  )
}
