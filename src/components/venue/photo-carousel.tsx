'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'

interface PhotoCarouselProps {
  photos: string[]
  venueName: string
  onPhotoTap?: (index: number) => void
}

export function PhotoCarousel({ photos, venueName, onPhotoTap }: PhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (photos.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 to-secondary-900" />
    )
  }

  if (photos.length === 1) {
    return (
      <Image
        src={photos[0]}
        alt={venueName}
        fill
        className="object-cover"
        priority
        onClick={() => onPhotoTap?.(0)}
      />
    )
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {photos.map((photo, i) => (
          <div
            key={photo}
            className="relative flex-shrink-0 w-full h-full snap-start"
            onClick={() => onPhotoTap?.(i)}
          >
            <Image
              src={photo}
              alt={`${venueName} photo ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      <div
        data-testid="carousel-dots"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-xs pointer-events-none"
      >
        {photos.map((_, i) => (
          <div
            key={i}
            data-active={i === activeIndex ? 'true' : 'false'}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === activeIndex
                ? 'bg-secondary-50 w-2.5'
                : 'bg-secondary-50/50'
            }`}
          />
        ))}
      </div>
    </>
  )
}
