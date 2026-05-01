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
        'inline-flex max-w-full items-center gap-s rounded-full bg-secondary-50 px-l py-s text-sm font-medium text-secondary-900 shadow-soft transition-all hover:bg-secondary-100 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] active:scale-[0.98]',
        className
      )}
    >
      <FontAwesomeIcon icon={faImages} className="text-xs" />
      <span className="truncate">View all photos</span>
    </button>
  )
}
