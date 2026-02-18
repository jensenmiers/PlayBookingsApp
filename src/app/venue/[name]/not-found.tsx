import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'

export default function VenueNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/70 to-primary-400/15">
      <Navigation />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-2xl font-bold text-secondary-50 mb-4">Venue Not Found</h1>
        <p className="text-secondary-50/60 mb-6">The venue you are looking for does not exist.</p>
        <Link href="/venues" className="text-secondary-50/60 hover:underline">
          Browse all venues
        </Link>
      </div>
    </div>
  )
}
