'use client'

import dynamic from 'next/dynamic'

export const DeferredPhotoLightbox = dynamic(
  () => import('./photo-lightbox').then((module) => module.PhotoLightbox),
  { ssr: false }
)
