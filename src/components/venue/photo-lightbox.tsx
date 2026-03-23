'use client'

import { useCallback, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface PhotoLightboxProps {
  photos: string[]
  venueName: string
  currentIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function PhotoLightbox({
  photos,
  venueName,
  currentIndex,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onIndexChange(currentIndex + 1)
    }
  }, [currentIndex, photos.length, onIndexChange])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1)
    }
  }, [currentIndex, onIndexChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  return (
    <Dialog modal open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 max-w-none w-screen h-screen translate-x-0 translate-y-0 top-0 left-0 rounded-none border-none bg-secondary-900/95 p-0 flex items-center justify-center"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-l right-l z-10 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/20 transition-colors"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Previous button */}
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            aria-label="Previous"
            className="absolute left-l z-10 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/20 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}

        {/* Next button */}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={goNext}
            aria-label="Next"
            className="absolute right-l z-10 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/20 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        )}

        {/* Photo */}
        <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-l">
          <Image
            src={photos[currentIndex]}
            alt={`${venueName} photo ${currentIndex + 1}`}
            fill
            className="object-contain"
          />
        </div>

        {/* Counter */}
        <div className="absolute bottom-xl left-1/2 -translate-x-1/2 text-secondary-50/70 text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
      </DialogContent>
    </Dialog>
  )
}
