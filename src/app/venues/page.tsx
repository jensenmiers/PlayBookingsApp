'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { VenueCard } from '@/components/venues/venue-card'
import { VenueCardSkeleton } from '@/components/book/venue-card-skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/ui/error-message'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/lib/supabase/client'
import type { Venue } from '@/types'
import type { PaginatedResponse } from '@/types/api'

// Type for next available slot info
interface NextAvailableInfo {
  displayText: string
  slotId: string
}

// Helper to format next available display text
function formatNextAvailable(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const slotDate = new Date(year, month - 1, day)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const timeParts = timeStr.split(':')
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  
  const timeDate = new Date()
  timeDate.setHours(hours, minutes, 0, 0)
  const formattedTime = timeDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })

  if (slotDate.getTime() === today.getTime()) {
    return `Today ${formattedTime}`
  } else if (slotDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${formattedTime}`
  } else {
    const formattedDate = slotDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    return `${formattedDate} ${formattedTime}`
  }
}

function VenuesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10))
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    total_pages: number
  } | null>(null)
  
  // Store next available info keyed by venue ID
  const [nextAvailableMap, setNextAvailableMap] = useState<Record<string, NextAvailableInfo>>({})

  // Fetch venues from API
  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.set('page', currentPage.toString())
        params.set('limit', '10')
        if (searchQuery.trim()) {
          params.set('search', searchQuery.trim())
        }

        const response = await fetch(`/api/venues?${params.toString()}`)
        const data: PaginatedResponse<Venue> = await response.json()

        if (!response.ok || !data.success) {
          throw new Error('Failed to fetch venues')
        }

        setVenues(data.data)
        setPagination(data.pagination)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load venues'
        setError(message)
        setVenues([])
      } finally {
        setLoading(false)
      }
    }

    fetchVenues()
  }, [currentPage, searchQuery])

  // Fetch next available times for all venues
  useEffect(() => {
    const fetchNextAvailable = async () => {
      try {
        const supabase = createClient()
        
        // Call the RPC function to get next available slots
        const { data, error: rpcError } = await supabase.rpc(
          'get_venues_with_next_available',
          {
            p_date_filter: null,
            p_user_lat: null,
            p_user_lng: null,
            p_radius_miles: null,
          }
        )

        if (rpcError) {
          console.error('Failed to fetch next available times:', rpcError)
          return
        }

        // Build a map of venue_id -> next available info
        const availabilityMap: Record<string, NextAvailableInfo> = {}
        for (const row of data || []) {
          if (row.next_slot_id && row.next_slot_date && row.next_slot_start_time) {
            availabilityMap[row.venue_id] = {
              displayText: formatNextAvailable(row.next_slot_date, row.next_slot_start_time),
              slotId: row.next_slot_id,
            }
          }
        }
        
        setNextAvailableMap(availabilityMap)
      } catch (err) {
        console.error('Error fetching next available:', err)
      }
    }

    fetchNextAvailable()
  }, []) // Only fetch once on mount

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on new search
    updateURL({ search: value, page: 1 })
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateURL({ search: searchQuery, page: 1 })
    setCurrentPage(1)
  }

  // Update URL without navigation
  const updateURL = (params: { search?: string; page?: number }) => {
    const newParams = new URLSearchParams(searchParams.toString())
    
    if (params.search !== undefined) {
      if (params.search.trim()) {
        newParams.set('search', params.search.trim())
      } else {
        newParams.delete('search')
      }
    }
    
    if (params.page !== undefined) {
      if (params.page === 1) {
        newParams.delete('page')
      } else {
        newParams.set('page', params.page.toString())
      }
    }

    router.push(`/venues?${newParams.toString()}`, { scroll: false })
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateURL({ page: newPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif text-secondary-50 mb-2">All Venues</h1>
          <p className="text-secondary-50/60">Discover basketball courts available for booking</p>
        </div>

        {/* Search Section */}
        <form onSubmit={handleSearchSubmit} className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="text-secondary-50/50" />
            </div>
            <Input
              type="text"
              placeholder="Search by venue name, city, or address..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary-800 rounded-xl shadow-soft"
            />
          </div>
        </form>

        {/* Results Count */}
        {pagination && !loading && (
          <div className="mb-4 text-secondary-50/60 text-sm">
            {pagination.total > 0 ? (
              <>
                Showing {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} venue{pagination.total !== 1 ? 's' : ''}
              </>
            ) : (
              'No venues found'
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <VenueCardSkeleton />
            <VenueCardSkeleton />
            <VenueCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-4">
            <ErrorMessage error={error} title="Failed to load venues" />
            <Button
              onClick={() => {
                const params = new URLSearchParams()
                params.set('page', currentPage.toString())
                params.set('limit', '10')
                if (searchQuery.trim()) {
                  params.set('search', searchQuery.trim())
                }
                window.location.reload()
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Venues List */}
        {!loading && !error && venues.length > 0 && (
          <div className="space-y-4 mb-6">
            {venues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                nextAvailable={nextAvailableMap[venue.id] || null}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && venues.length === 0 && (
          <div className="text-center py-12">
            <p className="text-secondary-50/60 text-lg mb-2">No venues found</p>
            {searchQuery && (
              <p className="text-secondary-50/50 text-sm mb-4">
                Try adjusting your search terms
              </p>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.total_pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-xl"
            >
              Previous
            </Button>
            <span className="text-secondary-50/60 text-sm">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pagination.total_pages}
              className="rounded-xl"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-serif text-secondary-50 mb-2">All Venues</h1>
          <p className="text-secondary-50/60">Discover basketball courts available for booking</p>
        </div>
        <div className="space-y-4">
          <VenueCardSkeleton />
          <VenueCardSkeleton />
          <VenueCardSkeleton />
        </div>
      </div>
    </div>
  )
}export default function VenuesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VenuesContent />
    </Suspense>
  )
}