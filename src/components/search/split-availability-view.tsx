'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
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
import { VenueAccessSegment } from '@/components/venues/venue-access-segment'
import { ErrorMessage } from '@/components/ui/error-message'
import Link from 'next/link'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import {
  formatVenueCardPriceLine,
  matchesAccessFilter,
  parseVenueAccessFilter,
  resolveVenueAccess,
  type VenueAccessFilter,
} from '@/lib/venueAccess'
import { slugify } from '@/lib/utils'
import { addDaysToDateString, getDateStringInTimeZone } from '@/utils/dateHelpers'

type ViewMode = 'map' | 'list'

const PLATFORM_TIME_ZONE = 'America/Los_Angeles'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Split view component combining map and availability list
 * Desktop: Side-by-side (map 60%, list 40%)
 * Mobile: Toggle between map and list views
 */
export function SplitAvailabilityView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamAccess = parseVenueAccessFilter(searchParams.get('access') || 'all')
  const todayKey = getDateStringInTimeZone(new Date(), PLATFORM_TIME_ZONE)
  const todayDate = parseLocalDate(todayKey)
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [accessFilter, setAccessFilter] = useState<VenueAccessFilter>(searchParamAccess)

  useEffect(() => {
    setAccessFilter(searchParamAccess)
  }, [searchParamAccess])

  // Get user location for distance-based sorting (opt-in via location icon button)
  const { latitude: userLat, longitude: userLng, loading: locationLoading, requestLocation } = useUserLocation()
  const hasLocation = userLat != null && userLng != null

  // Fetch venues with next available slots
  const { data: venues, loading, error, refetch } = useVenuesWithNextAvailable({
    dateFilter: selectedDate,
    userLat: userLat || undefined,
    userLng: userLng || undefined,
  })

  // Filter venues by search query and access segment
  const filteredVenues = useMemo(() => {
    if (!venues) return []

    const query = searchQuery.trim().toLowerCase()
    return venues.filter((venue) => {
      const matchesSearch =
        !query
        || venue.name.toLowerCase().includes(query)
        || venue.city.toLowerCase().includes(query)
        || venue.address.toLowerCase().includes(query)

      if (!matchesSearch) {
        return false
      }

      return matchesAccessFilter(
        {
          offers_open_gym: venue.offersOpenGym,
          offers_private_rental: venue.offersPrivateRental,
        },
        accessFilter
      )
    })
  }, [venues, searchQuery, accessFilter])

  // List rows: private rentals need a next regular slot; open gym can show without one.
  const venuesWithAvailability = useMemo(() => {
    if (accessFilter === 'open_gym') {
      return filteredVenues
    }
    return filteredVenues.filter((venue) => venue.nextAvailable !== null)
  }, [filteredVenues, accessFilter])

  const selectedDateObject = parseLocalDate(selectedDate)

  const handleAccessChange = (value: VenueAccessFilter) => {
    setAccessFilter(value)
    const nextParams = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      nextParams.delete('access')
    } else {
      nextParams.set('access', value)
    }
    const query = nextParams.toString()
    router.push(query ? `/search?${query}` : '/search', { scroll: false })
  }

  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDateKey = addDaysToDateString(selectedDate, direction === 'prev' ? -1 : 1)
    if (direction === 'prev' && newDateKey < todayKey) return
    setSelectedDate(newDateKey)
    setShowDatePicker(false)
  }

  const handleVenueSelect = (venue: MapVenue) => {
    setSelectedVenueId(venue.id)
  }

  const getDateDisplay = () => {
    return selectedDate === todayKey ? 'Today' : format(selectedDateObject, 'EEE, MMM d')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:px-l lg:pb-l">
      {/* Search and Filter Bar */}
      <div className="flex-shrink-0 px-l pt-l pb-m bg-secondary-800 border-b border-secondary-50/10">
        {/* Search Input */}
        <div className="relative mb-m">
          <div className="absolute inset-y-0 left-0 pl-l flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-secondary-300" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or venue name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4xl pr-l py-m bg-background rounded-xl border-secondary-50/10"
          />
        </div>

        <div className="mb-m">
          <VenueAccessSegment value={accessFilter} onChange={handleAccessChange} />
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-s overflow-x-auto pb-xs">
          {/* Mobile View Toggle */}
          <div className="flex-shrink-0 lg:hidden">
            <div className="flex bg-secondary-50/5 rounded-lg p-xxs">
              <Button
                size="sm"
                onClick={() => setViewMode('map')}
                className={`rounded-md px-m py-s text-xs ${
                  viewMode === 'map'
                    ? 'bg-secondary-800 text-secondary-50/70 shadow-sm'
                    : 'bg-transparent text-secondary-50/50 hover:text-secondary-50/70'
                }`}
              >
                <FontAwesomeIcon icon={faMap} className="mr-s" />
                Map
              </Button>
              <Button
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-md px-m py-s text-xs ${
                  viewMode === 'list'
                    ? 'bg-secondary-800 text-secondary-50/70 shadow-sm'
                    : 'bg-transparent text-secondary-50/50 hover:text-secondary-50/70'
                }`}
              >
                <FontAwesomeIcon icon={faList} className="mr-s" />
                List
              </Button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="relative flex-shrink-0 flex items-center gap-xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('prev')}
              disabled={selectedDate === todayKey}
              aria-label="Previous day"
              className="h-9 w-9 rounded-lg bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>
            <Button
              onClick={() => setShowDatePicker((open) => !open)}
              aria-expanded={showDatePicker}
              aria-haspopup="dialog"
              className="flex items-center gap-s rounded-lg px-m py-s text-sm whitespace-nowrap bg-primary-400/15 text-primary-400 hover:bg-primary-400/25"
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
              <span>{getDateDisplay()}</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('next')}
              aria-label="Next day"
              className="h-9 w-9 rounded-lg bg-secondary-50/5 text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
            {showDatePicker && (
              <div className="absolute left-0 top-full z-50 mt-xs rounded-xl border border-secondary-50/10 bg-secondary-800 p-s shadow-lg">
                <Calendar
                  mode="single"
                  selected={selectedDateObject}
                  onSelect={(date) => {
                    if (!date) return
                    setSelectedDate(format(date, 'yyyy-MM-dd'))
                    setShowDatePicker(false)
                  }}
                  disabled={(date) => date < todayDate}
                />
              </div>
            )}
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-50/60 mx-auto mb-s"></div>
                <p className="text-secondary-50/60 text-sm">Loading map...</p>
              </div>
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center bg-background p-l">
              <ErrorMessage error={error} title="Failed to load venues" />
            </div>
          ) : (
            <AvailabilityMap
              venues={venuesWithAvailability}
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
          <div className="p-l">
            {/* Results Header */}
            <div className="mb-l">
              <h2 className="text-lg font-semibold text-secondary-50">
                {accessFilter === 'open_gym' ? 'Open Gym Venues' : 'Available Slots'}
              </h2>
              <p className="text-sm text-secondary-50/60">
                {loading
                  ? 'Loading...'
                  : accessFilter === 'open_gym'
                    ? `${venuesWithAvailability.length} venue${venuesWithAvailability.length !== 1 ? 's' : ''}`
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
              <div className="space-y-m">
                {venuesWithAvailability.map((venue) => (
                  <MapVenueCard 
                    key={venue.id} 
                    venue={venue}
                    accessFilter={accessFilter}
                    isSelected={selectedVenueId === venue.id}
                    onClick={() => setSelectedVenueId(venue.id)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && venuesWithAvailability.length === 0 && (
              <EmptyState hasVenues={filteredVenues.length > 0} />
            )}

            {/* Explore All Courts Link */}
            <div className="mt-xl pt-l border-t border-secondary-50/10 text-center">
              <Link 
                href="/venues" 
                className="text-secondary-50/60 hover:text-secondary-50 text-sm font-medium hover:underline"
              >
                Explore all courts →
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
  accessFilter,
  isSelected,
  onClick 
}: { 
  venue: MapVenue
  accessFilter: VenueAccessFilter
  isSelected: boolean
  onClick: () => void 
}) {
  const bookingMode = getBookingModeDisplay(
    { booking_mode: venue.bookingMode, instant_booking: venue.instantBooking },
    'compact'
  )
  const { offersPrivateRental } = resolveVenueAccess({
    offers_open_gym: venue.offersOpenGym,
    offers_private_rental: venue.offersPrivateRental,
  })
  const priceLine = formatVenueCardPriceLine({
    offers_open_gym: venue.offersOpenGym,
    offers_private_rental: venue.offersPrivateRental,
    drop_in_price: venue.dropInPrice,
    hourly_rate: venue.hourlyRate,
  })
  const showNextAvailable = Boolean(venue.nextAvailable) && accessFilter !== 'open_gym'
  const showBookingModeChip = offersPrivateRental && accessFilter !== 'open_gym'

  return (
    <div 
      onClick={onClick}
      className={`
        bg-secondary-800 rounded-xl p-l cursor-pointer transition-all
        border-2 shadow-sm hover:shadow-md
        ${isSelected 
          ? 'border-primary-400 ring-1 ring-primary-200' 
          : 'border-transparent hover:border-secondary-50/10'
        }
      `}
    >
      <div className="flex items-start justify-between gap-m">
        {/* Left: Venue info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-50 truncate">{venue.name}</h3>
          <p className="text-sm text-secondary-50/60">{venue.city}, {venue.state}</p>
          {venue.distanceMiles !== null && (
            <p className="text-xs text-secondary-50/50 mt-xs">
              {venue.distanceMiles.toFixed(1)} miles away
            </p>
          )}
        </div>

        {/* Right: Price */}
        <div className="text-right flex-shrink-0">
          {priceLine ? (
            <span className="font-bold text-secondary-50 text-sm">
              {priceLine}
            </span>
          ) : null}
        </div>
      </div>

      {/* Next Available — two-row meta strip for consistent mobile chip sizing */}
      {(showNextAvailable || showBookingModeChip || venue.offersOpenGym) && (
        <div className="mt-m space-y-s">
          {showNextAvailable && venue.nextAvailable && (
            <div data-testid="venue-meta-datetime-row">
              <span className="inline-flex max-w-full bg-primary-400/15 text-primary-400 text-sm font-medium px-m py-xs rounded-lg whitespace-nowrap">
                {venue.nextAvailable.displayText}
              </span>
            </div>
          )}
          <div
            data-testid="venue-meta-chips-row"
            className="flex items-center justify-between gap-s"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-s">
              {venue.offersOpenGym && (
                <span className="whitespace-nowrap bg-accent-400/15 text-accent-400 text-xs px-s py-xxs rounded-full">
                  Open Gym
                </span>
              )}
              {venue.offersPrivateRental && (
                <span className="whitespace-nowrap bg-primary-400/10 text-primary-400 text-xs px-s py-xxs rounded-full">
                  Private Rental
                </span>
              )}
              {showBookingModeChip && (
                <span
                  className={`whitespace-nowrap text-xs px-s py-xxs rounded-full ${
                    bookingMode.mode === 'instant'
                      ? 'bg-accent-400/15 text-accent-400'
                      : 'bg-secondary-50/10 text-secondary-50/70'
                  }`}
                >
                  {bookingMode.label}
                </span>
              )}
              {venue.insuranceRequired && (
                <span className="whitespace-nowrap bg-secondary-50/10 text-secondary-50/70 text-xs px-s py-xxs rounded-full">
                  Insurance
                </span>
              )}
            </div>
            <Link
              href={`/venue/${slugify(venue.name)}`}
              className="flex-shrink-0 text-sm font-medium text-secondary-50/60 hover:text-secondary-50"
              onClick={(e) => e.stopPropagation()}
            >
              Book →
            </Link>
          </div>
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
}: { 
  hasVenues: boolean
}) {
  return (
    <div className="text-center py-2xl">
      <div className="bg-secondary-50/5 rounded-full p-l w-16 h-16 mx-auto mb-l flex items-center justify-center">
        <FontAwesomeIcon icon={faCalendarDays} className="text-2xl text-secondary-400" />
      </div>
      
      {hasVenues ? (
        <>
          <p className="text-secondary-50 font-medium mb-s">No availability found</p>
          <p className="text-secondary-50/60 text-sm mb-l">
            No slots available for this date. Try a different day.
          </p>
        </>
      ) : (
        <>
          <p className="text-secondary-50 font-medium mb-s">No venues found</p>
          <p className="text-secondary-50/60 text-sm mb-l">
            Try adjusting your search or filters.
          </p>
        </>
      )}

      <Link 
        href="/venues"
        className="inline-block bg-primary-400 hover:bg-primary-500 text-secondary-900 font-medium px-xl py-m rounded-xl transition-colors"
      >
        Browse all courts
      </Link>
    </div>
  )
}

export default SplitAvailabilityView
