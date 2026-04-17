'use client'

import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faImages } from '@fortawesome/free-solid-svg-icons'

interface VenueGallerySectionProps {
  photos: string[]
  venueName: string
  style: 'strip' | 'mosaic' | 'tour'
  onPhotoTap: (index: number) => void
}

export function VenueGallerySection({ photos, venueName, style, onPhotoTap }: VenueGallerySectionProps) {
  if (photos.length === 0) return null

  return (
    <section>
      <h2 className="font-serif text-xl text-secondary-50 mb-m">
        Take the Tour
      </h2>

      {style === 'strip' && (
        <StripGallery photos={photos} venueName={venueName} onPhotoTap={onPhotoTap} />
      )}
      {style === 'mosaic' && (
        <MosaicGallery photos={photos} venueName={venueName} onPhotoTap={onPhotoTap} />
      )}
      {style === 'tour' && (
        <TourGallery photos={photos} venueName={venueName} onPhotoTap={onPhotoTap} />
      )}
    </section>
  )
}

function StripGallery({ photos, venueName, onPhotoTap }: Omit<VenueGallerySectionProps, 'style'>) {
  const maxVisible = 6
  const visiblePhotos = photos.slice(0, maxVisible)
  const remainingCount = photos.length - maxVisible

  return (
    <div
      className="flex gap-s overflow-x-auto scrollbar-hide pb-s"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {visiblePhotos.map((photo, i) => (
        <button
          key={i}
          onClick={() => onPhotoTap(i)}
          className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden group"
        >
          <Image
            src={photo}
            alt={`${venueName} photo ${i + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="96px"
          />
          <div className="absolute inset-0 bg-secondary-900/0 group-hover:bg-secondary-900/20 transition-colors" />
        </button>
      ))}

      {remainingCount > 0 && (
        <button
          onClick={() => onPhotoTap(maxVisible)}
          className="flex-shrink-0 w-24 h-24 rounded-xl bg-secondary-800/60 border border-secondary-50/10 flex flex-col items-center justify-center gap-xs hover:bg-secondary-800 transition-colors"
        >
          <FontAwesomeIcon icon={faImages} className="text-secondary-50/50" />
          <span className="text-secondary-50/60 text-xs font-medium">
            +{remainingCount}
          </span>
        </button>
      )}
    </div>
  )
}

function MosaicGallery({ photos, venueName, onPhotoTap }: Omit<VenueGallerySectionProps, 'style'>) {
  const mosaicPhotos = photos.slice(0, 5)

  return (
    <div className="grid grid-cols-2 gap-s">
      {mosaicPhotos.map((photo, i) => (
        <button
          key={i}
          onClick={() => onPhotoTap(i)}
          className={`relative rounded-xl overflow-hidden group ${
            i === 0 ? 'col-span-2 h-48' : 'h-32'
          }`}
        >
          <Image
            src={photo}
            alt={`${venueName} photo ${i + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes={i === 0 ? '(max-width: 640px) 100vw, 640px' : '(max-width: 640px) 50vw, 320px'}
          />
          <div className="absolute inset-0 bg-secondary-900/0 group-hover:bg-secondary-900/20 transition-colors" />

          {/* Show count on last visible tile if there are more photos */}
          {i === mosaicPhotos.length - 1 && photos.length > 5 && (
            <div className="absolute inset-0 bg-secondary-900/50 flex items-center justify-center">
              <span className="text-secondary-50 text-lg font-semibold">
                +{photos.length - 5}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function TourGallery({ photos, venueName, onPhotoTap }: Omit<VenueGallerySectionProps, 'style'>) {
  return (
    <div
      className="flex gap-m overflow-x-auto scrollbar-hide pb-s"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Video placeholder tile */}
      <div className="relative flex-shrink-0 w-44 h-28 rounded-xl overflow-hidden bg-secondary-800/80 border border-secondary-50/10 flex flex-col items-center justify-center gap-xs">
        <div className="w-10 h-10 rounded-full bg-secondary-50/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faPlay} className="text-secondary-50/60 text-sm ml-xxs" />
        </div>
        <span className="text-secondary-50/40 text-[10px] uppercase tracking-wider">
          Video coming soon
        </span>
      </div>

      {/* Photo tiles */}
      {photos.map((photo, i) => (
        <button
          key={i}
          onClick={() => onPhotoTap(i)}
          className="relative flex-shrink-0 w-44 h-28 rounded-xl overflow-hidden group"
        >
          <Image
            src={photo}
            alt={`${venueName} photo ${i + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="176px"
          />
          <div className="absolute inset-0 bg-secondary-900/0 group-hover:bg-secondary-900/20 transition-colors" />
        </button>
      ))}
    </div>
  )
}
