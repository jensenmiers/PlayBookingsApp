'use client'

import { useParams } from 'next/navigation'
import { VenueDetailPage } from '@/components/venue/venue-detail-page'

export default function VenuePage() {
  const params = useParams()
  const slug = params?.name as string

  return <VenueDetailPage slug={slug} />
}


