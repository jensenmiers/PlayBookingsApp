import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'

export default function VenueNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-secondary-50/70 to-primary-50">
      <Navigation />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-2xl font-bold text-secondary-800 mb-4">Venue Not Found</h1>
        <p className="text-secondary-600 mb-6">The venue you are looking for does not exist.</p>
        <Link href="/venues" className="text-secondary-600 hover:underline">
          Browse all venues
        </Link>
      </div>
    </div>
  )
}
