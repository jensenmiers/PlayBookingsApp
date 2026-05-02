'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImages } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface VenuePhotoPillButtonProps {
  photoCount: number
  onOpenGallery: () => void
  className?: string
}

export function VenuePhotoPillButton({
  photoCount,
  onOpenGallery,
  className,
}: VenuePhotoPillButtonProps) {
  if (photoCount === 0) return null

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenGallery()
      }}
      aria-label={`View all ${photoCount} venue ${photoCount === 1 ? 'photo' : 'photos'}`}
      className={cn(
        'inline-flex max-w-full items-center gap-xs rounded-full border border-secondary-50/15 bg-secondary-900/70 px-m py-xs text-xs font-medium text-secondary-50 shadow-soft backdrop-blur-md transition-all hover:bg-secondary-900/85 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] active:scale-[0.98] sm:gap-s sm:bg-secondary-50 sm:px-l sm:py-s sm:text-sm sm:text-secondary-900 sm:hover:bg-secondary-100',
        className
      )}
    >
      <FontAwesomeIcon icon={faImages} className="text-xs" />
      <span className="truncate sm:hidden">
        {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
      </span>
      <span className="hidden truncate sm:inline">View all photos</span>
    </button>
  )
}
