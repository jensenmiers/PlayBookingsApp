'use client'

import { useCallback, useEffect } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

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
        className="fixed inset-0 top-0 left-0 h-screen w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-none bg-secondary-900/95 p-0 sm:max-w-none overflow-x-hidden overflow-y-hidden"
      >
        <DialogTitle className="sr-only">{venueName} photo viewer</DialogTitle>
        <DialogDescription className="sr-only">
          Viewing photo {currentIndex + 1} of {photos.length}
        </DialogDescription>

        <div
          className="relative mx-auto flex h-full w-full flex-col items-center justify-center gap-m"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          }}
        >
          <DialogClose asChild>
            <button
              aria-label="Close"
              className="absolute top-0 right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </DialogClose>

          <div className="relative w-full max-w-5xl flex-1 min-h-0">
            {/* Previous button */}
            {currentIndex > 0 && (
              <button
                onClick={goPrev}
                aria-label="Previous"
                className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}

            {/* Next button */}
            {currentIndex < photos.length - 1 && (
              <button
                onClick={goNext}
                aria-label="Next"
                className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            )}

            <Image
              src={photos[currentIndex]}
              alt={`${venueName} photo ${currentIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          <div className="text-sm text-secondary-50/70">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
