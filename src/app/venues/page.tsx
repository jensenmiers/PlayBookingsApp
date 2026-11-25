'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { VenueCard } from '@/components/venues/venue-card'
import { VenueCardGridSkeleton } from '@/components/venues/venue-card-grid-skeleton'
import { VenueAccessSegment } from '@/components/venues/venue-access-segment'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/ui/error-message'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { parseVenueAccessFilter, type VenueAccessFilter } from '@/lib/venueAccess'
import type { MapVenue, NextAvailableSlot } from '@/lib/venueDiscovery'
import type { Venue } from '@/types'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

// Type for next available slot info
const VENUE_DIRECTORY_TIMEOUT_MS = 12_000
const VENUE_DIRECTORY_TIMEOUT_MESSAGE = 'Timed out loading venues. Please try again.'

function VenuesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamSearch = searchParams.get('search') || ''
  const parsedSearchParamPage = parseInt(searchParams.get('page') || '1', 10)
  const searchParamPage = Number.isFinite(parsedSearchParamPage) ? Math.max(1, parsedSearchParamPage) : 1
  const searchParamAccess = parseVenueAccessFilter(searchParams.get('access') || 'all')
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParamSearch)
  const [currentPage, setCurrentPage] = useState(searchParamPage)
  const [accessFilter, setAccessFilter] = useState<VenueAccessFilter>(searchParamAccess)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    total_pages: number
  } | null>(null)
  const venuesRef = useRef<Venue[]>([])
  const venuesQueryRef = useRef<string | null>(null)
  
  // Store next available info keyed by venue ID
  const [nextAvailableMap, setNextAvailableMap] = useState<Record<string, NextAvailableSlot>>({})

  useEffect(() => {
    venuesRef.current = venues
  }, [venues])

  useEffect(() => {
    setSearchQuery(searchParamSearch)
    setCurrentPage(searchParamPage)
    setAccessFilter(searchParamAccess)
  }, [searchParamSearch, searchParamPage, searchParamAccess])

  // Fetch venues from API
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, VENUE_DIRECTORY_TIMEOUT_MS)

    const fetchVenues = async () => {
      const params = new URLSearchParams()
      params.set('page', currentPage.toString())
      params.set('limit', '12')
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      if (accessFilter !== 'all') {
        params.set('access', accessFilter)
      }
      const queryKey = params.toString()
      const isSameQuery = venuesQueryRef.current === queryKey

      if (!isSameQuery) {
        venuesRef.current = []
        setVenues([])
        setPagination(null)
      }
      setLoading(!isSameQuery || venuesRef.current.length === 0)
      setError(null)

      try {
        const response = await fetch(`/api/venues?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data: PaginatedResponse<Venue> = await response.json()

        if (!response.ok || !data.success) {
          throw new Error('Failed to fetch venues')
        }

        if (!active) return

        const nextVenues = data.data
        venuesRef.current = nextVenues
        venuesQueryRef.current = queryKey
        setVenues(nextVenues)
        setPagination(data.pagination)
        setError(null)
      } catch (err) {
        if (!active) return

        const isAbortError = err instanceof Error && err.name === 'AbortError'
        const message = err instanceof Error ? err.message : 'Failed to load venues'
        const previousVenues = isSameQuery ? venuesRef.current : []

        if (previousVenues.length > 0) {
          setVenues(previousVenues)
          setError(null)
        } else {
          setError(isAbortError ? VENUE_DIRECTORY_TIMEOUT_MESSAGE : message)
          setVenues([])
        }
      } finally {
        if (active) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      }
    }

    fetchVenues()

    return () => {
      active = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [currentPage, searchQuery, accessFilter])

  // Fetch access-scoped next available times for card presentation.
  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const fetchNextAvailable = async () => {
      setNextAvailableMap({})

      try {
        const params = new URLSearchParams()
        if (accessFilter !== 'all') {
          params.set('access', accessFilter)
        }
        const query = params.toString()
        const url = query
          ? `/api/venues/next-available?${query}`
          : '/api/venues/next-available'
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const body: ApiResponse<MapVenue[]> = await response.json()

        if (!response.ok || !body.success) {
          throw new Error('Failed to fetch next available times')
        }
        if (!active) return

        const availabilityMap: Record<string, NextAvailableSlot> = {}
        for (const venue of body.data || []) {
          if (venue.nextAvailable) {
            availabilityMap[venue.id] = venue.nextAvailable
          }
        }

        setNextAvailableMap(availabilityMap)
      } catch (err) {
        if (!active || (err instanceof Error && err.name === 'AbortError')) {
          return
        }
        console.error('Error fetching next available:', err)
      }
    }

    void fetchNextAvailable()

    return () => {
      active = false
      controller.abort()
    }
  }, [accessFilter])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page on new search
    updateURL({ search: value, page: 1, access: accessFilter })
  }

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateURL({ search: searchQuery, page: 1, access: accessFilter })
    setCurrentPage(1)
  }

  const handleAccessChange = (value: VenueAccessFilter) => {
    setAccessFilter(value)
    setCurrentPage(1)
    updateURL({ search: searchQuery, page: 1, access: value })
  }

  // Update URL without navigation
  const updateURL = (params: {
    search?: string
    page?: number
    access?: VenueAccessFilter
  }) => {
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

    if (params.access !== undefined) {
      if (params.access === 'all') {
        newParams.delete('access')
      } else {
        newParams.set('access', params.access)
      }
    }

    router.push(`/venues?${newParams.toString()}`, { scroll: false })
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateURL({ page: newPage, access: accessFilter })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="mx-auto max-w-6xl px-l py-xl">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-3xl font-bold font-serif text-secondary-50 mb-s">All Courts</h1>
          <p className="text-secondary-50/60">Discover basketball courts available for booking</p>
        </div>

        {/* Search Section */}
        <form onSubmit={handleSearchSubmit} className="mb-l">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-l flex items-center pointer-events-none">
              <FontAwesomeIcon icon={faSearch} className="text-secondary-50/50" />
            </div>
            <Input
              type="text"
              placeholder="Search by venue name, city, or address..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-4xl pr-l py-m bg-secondary-800 rounded-xl shadow-soft"
            />
          </div>
        </form>

        <div className="mb-xl">
          <VenueAccessSegment value={accessFilter} onChange={handleAccessChange} />
        </div>

        {/* Results Count */}
        {pagination && !loading && (
          <div className="mb-l text-secondary-50/60 text-sm">
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
          <div className="grid grid-cols-1 gap-l md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <VenueCardGridSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-l">
            <ErrorMessage error={error} title="Failed to load venues" />
            <Button
              onClick={() => {
                const params = new URLSearchParams()
                params.set('page', currentPage.toString())
                params.set('limit', '12')
                if (searchQuery.trim()) {
                  params.set('search', searchQuery.trim())
                }
                window.location.reload()
              }}
              className="mt-l"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Venues List */}
        {!loading && !error && venues.length > 0 && (
          <div className="grid grid-cols-1 gap-l md:grid-cols-2 lg:grid-cols-3 mb-xl">
            {venues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                nextAvailable={nextAvailableMap[venue.id] || null}
                accessFilter={accessFilter}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && venues.length === 0 && (
          <div className="text-center py-4xl">
            <p className="text-secondary-50/60 text-lg mb-s">No venues found</p>
            {searchQuery && (
              <p className="text-secondary-50/50 text-sm mb-l">
                Try adjusting your search terms
              </p>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.total_pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-l mt-xl">
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

      <PublicSiteFooter />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="mx-auto max-w-6xl px-l py-xl">
        <div className="mb-xl">
          <h1 className="text-3xl font-bold font-serif text-secondary-50 mb-s">All Courts</h1>
          <p className="text-secondary-50/60">Discover basketball courts available for booking</p>
        </div>
        <div className="grid grid-cols-1 gap-l md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <VenueCardGridSkeleton key={i} />
          ))}
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
