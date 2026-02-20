'use client'

import { useState, useMemo } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
  faClock,
  faSliders,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faMap,
  faList,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { useVenuesWithNextAvailable, useUserLocation, type MapVenue } from '@/hooks/useVenuesWithNextAvailable'
import { AvailabilityMap } from '@/components/maps/availability-map'
import { VenueCardSkeleton } from '@/components/search/venue-card-skeleton'
import { ErrorMessage } from '@/components/ui/error-message'
import Link from 'next/link'
import { slugify } from '@/lib/utils'

type ViewMode = 'map' | 'list'

/**
 * Split view component combining map and availability list
 * Desktop: Side-by-side (map 60%, list 40%)
 * Mobile: Toggle between map and list views
 */
export function SplitAvailabilityView() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // null = any date (show absolute next)
  const [selectedTime] = useState<string>('Any time')
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get user location for distance-based sorting (opt-in via location icon button)
  const { latitude: userLat, longitude: userLng, loading: locationLoading, requestLocation } = useUserLocation()
  const hasLocation = userLat != null && userLng != null

  // Fetch venues with next available slots
  const { data: venues, loading, error, refetch } = useVenuesWithNextAvailable({
    dateFilter: selectedDate || undefined,
    userLat: userLat || undefined,
    userLng: userLng || undefined,
  })

  // Filter venues by search query
  const filteredVenues = useMemo(() => {
    if (!venues) return []
    if (!searchQuery.trim()) return venues

    const query = searchQuery.toLowerCase()
    return venues.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.city.toLowerCase().includes(query) ||
      v.address.toLowerCase().includes(query)
    )
  }, [venues, searchQuery])

  // Venues with availability for the list
  const venuesWithAvailability = useMemo(() => {
    return filteredVenues.filter(v => v.nextAvailable !== null)
  }, [filteredVenues])

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number)
      const currentDate = new Date(y, m - 1, d)
      const newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1)
      setSelectedDate(format(newDate, 'yyyy-MM-dd'))
    } else {
      // If no date selected, start from today
      const newDate = direction === 'next' ? addDays(today, 1) : today
      setSelectedDate(format(newDate, 'yyyy-MM-dd'))
    }
  }

  const handleTodayClick = () => {
    if (selectedDate === format(today, 'yyyy-MM-dd')) {
      // If already on today, toggle to "any date" mode
      setSelectedDate(null)
    } else {
      setSelectedDate(format(today, 'yyyy-MM-dd'))
    }
  }

  const handleVenueSelect = (venue: MapVenue) => {
    setSelectedVenueId(venue.id)
  }

  // Format date for display
  const getDateDisplay = () => {
    if (!selectedDate) return 'Any Date'
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const isToday = selectedDate === format(today, 'yyyy-MM-dd')
    return isToday ? 'Today' : format(date, 'EEE, MMM d')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:px-4 lg:pb-4">
      {/* Search and Filter Bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-secondary-800 border-b border-secondary-50/10">
        {/* Search Input */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-secondary-300" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or venue name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-background rounded-xl border-secondary-50/10"
          />
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Mobile View Toggle */}
          <div className="flex-shrink-0 lg:hidden">
            <div className="flex bg-secondary-50/5 rounded-lg p-0.5">
              <Button
                size="sm"
                onClick={() => setViewMode('map')}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  viewMode === 'map'
                    ? 'bg-secondary-800 text-secondary-50/70 shadow-sm'
                    : 'bg-transparent text-secondary-50/50 hover:text-secondary-50/70'
                }`}
              >
                <FontAwesomeIcon icon={faMap} className="mr-1.5" />
                Map
              </Button>
              <Button
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  viewMode === 'list'
                    ? 'bg-secondary-800 text-secondary-50/70 shadow-sm'
                    : 'bg-transparent text-secondary-50/50 hover:text-secondary-50/70'
                }`}
              >
                <FontAwesomeIcon icon={faList} className="mr-1.5" />
                List
              </Button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex-shrink-0 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('prev')}
              className="h-9 w-9 rounded-lg bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>
            <Button
              onClick={handleTodayClick}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                selectedDate 
                  ? 'bg-primary-400/15 text-primary-400 hover:bg-primary-400/25' 
                  : 'bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10'
              }`}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
              <span>{getDateDisplay()}</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('next')}
              className="h-9 w-9 rounded-lg bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
          </div>

          {/* Location (opt-in): sort by distance when enabled */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => !hasLocation && !locationLoading && requestLocation()}
            disabled={locationLoading}
            title="Use my location"
            aria-label="Use my location"
            className={`min-h-[44px] min-w-[44px] h-9 w-9 rounded-lg ${
              hasLocation
                ? 'bg-primary-400/15 text-primary-400 hover:bg-primary-400/25'
                : 'bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10'
            }`}
          >
            {locationLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-secondary-400 border-t-transparent" />
            ) : (
              <FontAwesomeIcon icon={faLocationDot} className="text-sm" />
            )}
          </Button>

          {/* Time Filter */}
          <Button className="flex-shrink-0 flex items-center gap-2 bg-secondary-50/5 rounded-lg px-3 py-2 text-sm text-secondary-50/70 hover:bg-secondary-50/10">
            <FontAwesomeIcon icon={faClock} className="text-xs" />
            <span className="whitespace-nowrap">{selectedTime}</span>
            <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
          </Button>

          {/* Filters Button */}
          <Button className="flex-shrink-0 flex items-center gap-2 bg-secondary-50/5 rounded-lg px-3 py-2 text-sm text-secondary-50/70 hover:bg-secondary-50/10">
            <FontAwesomeIcon icon={faSliders} className="text-xs" />
            <span className="whitespace-nowrap">Filters</span>
          </Button>

        </div>
      </div>

      {/* Main Content: Split View */}
      <div className="flex-1 flex overflow-hidden lg:rounded-2xl lg:border lg:border-secondary-50/10">
        {/* Map Panel - Hidden on mobile when list is active */}
        <div 
          className={`
            ${viewMode === 'list' ? 'hidden lg:block' : 'block'} 
            lg:w-[60%] w-full h-full
          `}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-50/60 mx-auto mb-2"></div>
                <p className="text-secondary-50/60 text-sm">Loading map...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center bg-background p-4">
              <ErrorMessage error={error} title="Failed to load venues" />
            </div>
          ) : (
            <AvailabilityMap
              venues={filteredVenues}
              selectedVenueId={selectedVenueId}
              onVenueSelect={handleVenueSelect}
              className="w-full h-full"
            />
          )}
        </div>

        {/* List Panel - Hidden on mobile when map is active */}
        <div 
          className={`
            ${viewMode === 'map' ? 'hidden lg:block' : 'block'} 
            lg:w-[40%] w-full h-full overflow-y-auto bg-background border-l border-secondary-50/10
          `}
        >
          <div className="p-4">
            {/* Results Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-secondary-50">
                {selectedDate ? 'Available Slots' : 'Next Available Times'}
              </h2>
              <p className="text-sm text-secondary-50/60">
                {loading 
                  ? 'Loading...' 
                  : `${venuesWithAvailability.length} venue${venuesWithAvailability.length !== 1 ? 's' : ''} with availability`
                }
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="space-y-3">
                <VenueCardSkeleton />
                <VenueCardSkeleton />
                <VenueCardSkeleton />
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="space-y-3">
                <ErrorMessage error={error} title="Failed to load availability" />
                <Button onClick={() => refetch()} className="w-full rounded-xl">
                  Try Again
                </Button>
              </div>
            )}

            {/* Availability Cards */}
            {!loading && !error && venuesWithAvailability.length > 0 && (
              <div className="space-y-3">
                {venuesWithAvailability.map((venue) => (
                  <MapVenueCard 
                    key={venue.id} 
                    venue={venue}
                    isSelected={selectedVenueId === venue.id}
                    onClick={() => setSelectedVenueId(venue.id)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && venuesWithAvailability.length === 0 && (
              <EmptyState 
                hasVenues={filteredVenues.length > 0}
                dateFilter={selectedDate}
              />
            )}

            {/* Explore All Venues Link */}
            <div className="mt-6 pt-4 border-t border-secondary-50/10 text-center">
              <Link 
                href="/venues" 
                className="text-secondary-50/60 hover:text-secondary-50 text-sm font-medium hover:underline"
              >
                Explore all venues →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Simplified venue card for the availability list
 */
function MapVenueCard({ 
  venue, 
  isSelected,
  onClick 
}: { 
  venue: MapVenue
  isSelected: boolean
  onClick: () => void 
}) {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-secondary-800 rounded-xl p-4 cursor-pointer transition-all
        border-2 shadow-sm hover:shadow-md
        ${isSelected 
          ? 'border-primary-400 ring-1 ring-primary-200' 
          : 'border-transparent hover:border-secondary-50/10'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Venue info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-50 truncate">{venue.name}</h3>
          <p className="text-sm text-secondary-50/60">{venue.city}, {venue.state}</p>
          {venue.distanceMiles !== null && (
            <p className="text-xs text-secondary-50/50 mt-1">
              {venue.distanceMiles.toFixed(1)} miles away
            </p>
          )}
        </div>

        {/* Right: Price */}
        <div className="text-right flex-shrink-0">
          <span className="font-bold text-secondary-50">${venue.hourlyRate}</span>
          <span className="text-xs text-secondary-50/60">/hr</span>
        </div>
      </div>

      {/* Next Available */}
      {venue.nextAvailable && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-primary-400/15 text-primary-400 text-sm font-medium px-2.5 py-1 rounded-lg">
              {venue.nextAvailable.displayText}
            </span>
            {venue.instantBooking && (
              <span className="bg-accent-400/15 text-accent-400 text-xs px-2 py-0.5 rounded-full">
                Instant
              </span>
            )}
          </div>
          <Link
            href={`/venue/${slugify(venue.name)}`}
            className="text-sm font-medium text-secondary-50/60 hover:text-secondary-50"
            onClick={(e) => e.stopPropagation()}
          >
            Book →
          </Link>
        </div>
      )}
    </div>
  )
}

/**
 * Empty state with escape hatch to venues page
 */
function EmptyState({ 
  hasVenues, 
  dateFilter 
}: { 
  hasVenues: boolean
  dateFilter: string | null 
}) {
  return (
    <div className="text-center py-8">
      <div className="bg-secondary-50/5 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <FontAwesomeIcon icon={faCalendarDays} className="text-2xl text-secondary-400" />
      </div>
      
      {hasVenues ? (
        <>
          <p className="text-secondary-50 font-medium mb-2">No availability found</p>
          <p className="text-secondary-50/60 text-sm mb-4">
            {dateFilter 
              ? 'No slots available for this date. Try a different day.'
              : 'No upcoming availability at this time.'
            }
          </p>
        </>
      ) : (
        <>
          <p className="text-secondary-50 font-medium mb-2">No venues found</p>
          <p className="text-secondary-50/60 text-sm mb-4">
            Try adjusting your search or filters.
          </p>
        </>
      )}

      <Link 
        href="/venues"
        className="inline-block bg-primary-400 hover:bg-primary-500 text-secondary-900 font-medium px-6 py-2.5 rounded-xl transition-colors"
      >
        Browse all venues
      </Link>
    </div>
  )
}

export default SplitAvailabilityView
