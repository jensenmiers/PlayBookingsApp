'use client'

import { useState, useCallback, useMemo } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faBolt, faClock } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import type { MapVenue } from '@/hooks/useVenuesWithNextAvailable'
import Link from 'next/link'
import { slugify } from '@/lib/utils'

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css'

interface AvailabilityMapProps {
  venues: MapVenue[]
  onVenueSelect?: (venue: MapVenue) => void
  selectedVenueId?: string | null
  className?: string
}

// Default center: Los Angeles area
const DEFAULT_CENTER = {
  latitude: 34.0522,
  longitude: -118.2437,
}

const DEFAULT_ZOOM = 10

/**
 * Map component displaying venues with their next available time slot
 * Uses react-map-gl (Mapbox GL JS wrapper)
 */
export function AvailabilityMap({ 
  venues, 
  onVenueSelect, 
  selectedVenueId,
  className = '' 
}: AvailabilityMapProps) {
  const [popupVenue, setPopupVenue] = useState<MapVenue | null>(null)
  const [viewState, setViewState] = useState({
    latitude: DEFAULT_CENTER.latitude,
    longitude: DEFAULT_CENTER.longitude,
    zoom: DEFAULT_ZOOM,
  })

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Calculate bounds to fit all venues
  const bounds = useMemo(() => {
    if (venues.length === 0) return null
    
    const lats = venues.map(v => v.latitude)
    const lngs = venues.map(v => v.longitude)
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    }
  }, [venues])

  // Set initial view based on venues
  useMemo(() => {
    if (bounds && venues.length > 0) {
      const centerLat = (bounds.minLat + bounds.maxLat) / 2
      const centerLng = (bounds.minLng + bounds.maxLng) / 2
      
      // Calculate zoom based on bounds spread
      const latSpread = bounds.maxLat - bounds.minLat
      const lngSpread = bounds.maxLng - bounds.minLng
      const maxSpread = Math.max(latSpread, lngSpread)
      
      // Rough zoom calculation (higher spread = lower zoom)
      let zoom = DEFAULT_ZOOM
      if (maxSpread > 1) zoom = 8
      else if (maxSpread > 0.5) zoom = 9
      else if (maxSpread > 0.2) zoom = 10
      else if (maxSpread > 0.1) zoom = 11
      else zoom = 12

      setViewState({
        latitude: centerLat,
        longitude: centerLng,
        zoom,
      })
    }
  }, [bounds, venues.length])

  const handleMarkerClick = useCallback((venue: MapVenue) => {
    setPopupVenue(venue)
    onVenueSelect?.(venue)
  }, [onVenueSelect])

  const handlePopupClose = useCallback(() => {
    setPopupVenue(null)
  }, [])

  // If no Mapbox token, show fallback
  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center bg-secondary-50/5 rounded-xl ${className}`}>
        <div className="text-center p-8">
          <FontAwesomeIcon icon={faLocationDot} className="text-4xl text-secondary-400 mb-4" />
          <p className="text-secondary-50/60 font-medium">Map unavailable</p>
          <p className="text-secondary-50/50 text-sm mt-1">
            Mapbox token not configured
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* Venue Markers */}
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            latitude={venue.latitude}
            longitude={venue.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              handleMarkerClick(venue)
            }}
          >
            <VenueMarker 
              venue={venue} 
              isSelected={selectedVenueId === venue.id || popupVenue?.id === venue.id}
            />
          </Marker>
        ))}

        {/* Popup for selected venue */}
        {popupVenue && (
          <Popup
            latitude={popupVenue.latitude}
            longitude={popupVenue.longitude}
            anchor="bottom"
            onClose={handlePopupClose}
            closeOnClick={false}
            offset={40}
            className="venue-popup"
          >
            <VenuePopupContent venue={popupVenue} />
          </Popup>
        )}
      </Map>

      {/* Venues count badge */}
      <div className="absolute top-4 left-4 bg-secondary-800 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
        <span className="text-sm font-medium text-secondary-50/70">
          {venues.length} venue{venues.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

/**
 * Custom marker component for venues
 */
function VenueMarker({ venue, isSelected }: { venue: MapVenue; isSelected: boolean }) {
  const hasAvailability = venue.nextAvailable !== null

  return (
    <div 
      className={`
        cursor-pointer transition-all duration-200
        ${isSelected ? 'scale-110 z-10' : 'hover:scale-105'}
      `}
    >
      {/* Pin with availability indicator */}
      <div 
        className={`
          relative flex flex-col items-center
        `}
      >
        {/* Main pin */}
        <div 
          className={`
            rounded-full p-2 shadow-lg border-2
            ${hasAvailability 
              ? 'bg-primary-500 border-primary-600' 
              : 'bg-gray-400 border-gray-500'
            }
            ${isSelected ? 'ring-2 ring-white ring-offset-2' : ''}
          `}
        >
          <FontAwesomeIcon 
            icon={faLocationDot} 
            className="text-white text-lg"
          />
        </div>
        
        {/* Availability badge */}
        {hasAvailability && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="bg-secondary-800 text-secondary-50/70 text-xs font-medium px-2 py-0.5 rounded-full shadow-md border border-secondary-50/10">
              {venue.nextAvailable?.displayText}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Popup content for venue details
 */
function VenuePopupContent({ venue }: { venue: MapVenue }) {
  const venueSlug = slugify(venue.name)

  return (
    <div className="p-1 min-w-[220px] text-secondary-900">
      {/* Venue name and instant booking badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-secondary-900 text-sm leading-tight">
          {venue.name}
        </h3>
        {venue.instantBooking && (
          <span className="flex items-center gap-1 bg-accent-400/15 text-accent-400 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
            <FontAwesomeIcon icon={faBolt} className="text-[10px]" />
            <span>Instant</span>
          </span>
        )}
      </div>

      {/* Location */}
      <p className="text-secondary-600 text-xs mb-2">
        {venue.city}, {venue.state}
      </p>

      {/* Distance if available */}
      {venue.distanceMiles !== null && (
        <p className="text-secondary-500 text-xs mb-2">
          {venue.distanceMiles.toFixed(1)} miles away
        </p>
      )}

      {/* Next available slot */}
      {venue.nextAvailable ? (
        <div className="flex items-center gap-1.5 text-primary-600 text-sm font-medium mb-3">
          <FontAwesomeIcon icon={faClock} className="text-xs" />
          <span>Next: {venue.nextAvailable.displayText}</span>
        </div>
      ) : (
        <p className="text-secondary-500 text-xs mb-3">No times available</p>
      )}

      {/* Price and CTA */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-secondary-900 font-semibold">
          ${venue.hourlyRate}<span className="text-xs font-normal text-secondary-600">/hr</span>
        </span>
        <Button asChild size="sm" className="rounded-lg text-xs px-3 py-1 h-7">
          <Link href={`/venue/${venueSlug}`}>
            View & Book
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default AvailabilityMap
