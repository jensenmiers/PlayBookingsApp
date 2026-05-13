'use client'

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent, type TouchEvent } from 'react'
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
  const gestureStartX = useRef<number | null>(null)
  const hasMultiplePhotos = photos.length > 1

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

  const completeGesture = (endX: number | null) => {
    const startX = gestureStartX.current
    gestureStartX.current = null

    if (startX === null || endX === null) {
      return
    }

    const deltaX = startX - endX
    const swipeThreshold = 48

    if (deltaX > swipeThreshold) {
      goNext()
    } else if (deltaX < -swipeThreshold) {
      goPrev()
    }
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    gestureStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    completeGesture(event.changedTouches[0]?.clientX ?? null)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    gestureStartX.current = event.clientX
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    completeGesture(event.clientX)
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    gestureStartX.current = event.clientX
  }

  const handleMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    completeGesture(event.clientX)
  }

  return (
    <Dialog modal open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 h-dvh w-screen max-h-none max-w-none translate-x-0 translate-y-0 gap-0 overflow-x-hidden overflow-y-hidden rounded-none border-none bg-secondary-950/96 p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{venueName} photo viewer</DialogTitle>
        <DialogDescription className="sr-only">
          Viewing photo {currentIndex + 1} of {photos.length}
        </DialogDescription>

        <div
          data-testid="photo-lightbox-shell"
          className="relative mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto] items-stretch"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
            paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          }}
        >
          <div className="flex min-h-4xl w-full items-start justify-end">
            <DialogClose asChild>
              <button
                aria-label="Close"
                className="z-10 flex h-4xl w-4xl items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </DialogClose>
          </div>

          <div className="flex min-h-0 items-center justify-center pb-6xl sm:pb-l">
            <div
              data-testid="photo-lightbox-stage"
              className="relative h-[min(52dvh,24rem)] w-full max-w-5xl sm:h-[min(68vh,44rem)]"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <Image
                src={photos[currentIndex]}
                alt={`${venueName} photo ${currentIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div
            data-testid="photo-lightbox-footer"
            className="fixed bottom-0 left-0 right-0 z-20 flex min-h-5xl w-full items-center justify-center px-l pt-m"
            style={{
              paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
            }}
          >
            {hasMultiplePhotos && (
              <div
                data-testid="photo-lightbox-controls"
                className="flex items-center gap-l rounded-full bg-secondary-950/80 px-m py-s text-secondary-50/80 backdrop-blur-md"
              >
                <button
                  onClick={goPrev}
                  aria-label="Previous"
                  disabled={currentIndex === 0}
                  className="flex h-3xl w-3xl items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20 disabled:cursor-default disabled:opacity-35"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="min-w-4xl text-center text-sm text-secondary-50/70">
                  {currentIndex + 1} / {photos.length}
                </div>

                <button
                  onClick={goNext}
                  aria-label="Next"
                  disabled={currentIndex === photos.length - 1}
                  className="flex h-3xl w-3xl items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50 transition-colors hover:bg-secondary-50/20 disabled:cursor-default disabled:opacity-35"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
