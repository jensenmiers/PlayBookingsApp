'use client'

import { useState } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

import 'mapbox-gl/dist/mapbox-gl.css'

interface VenueLocationMapProps {
  name: string
  city: string
  state: string
  latitude?: number
  longitude?: number
  className?: string
}

const DEFAULT_CENTER = {
  latitude: 34.0522,
  longitude: -118.2437,
}

const DEFAULT_ZOOM = 10
const VENUE_ZOOM = 13

export function VenueLocationMap({
  name,
  city,
  state,
  latitude,
  longitude,
  className,
}: VenueLocationMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)

  const [viewState, setViewState] = useState({
    latitude: hasCoordinates ? Number(latitude) : DEFAULT_CENTER.latitude,
    longitude: hasCoordinates ? Number(longitude) : DEFAULT_CENTER.longitude,
    zoom: hasCoordinates ? VENUE_ZOOM : DEFAULT_ZOOM,
  })

  if (!mapboxToken) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-secondary-50/5', className)}>
        <div className="text-center p-6">
          <FontAwesomeIcon icon={faLocationDot} className="text-3xl text-secondary-400 mb-3" />
          <p className="text-secondary-50/70 font-medium">Map unavailable</p>
          <p className="text-secondary-50/50 text-sm mt-1">Mapbox token not configured</p>
        </div>
      </div>
    )
  }

  if (!hasCoordinates) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-secondary-50/5', className)}>
        <div className="text-center p-6">
          <FontAwesomeIcon icon={faLocationDot} className="text-3xl text-secondary-400 mb-3" />
          <p className="text-secondary-50/70 font-medium">Location pin unavailable</p>
          <p className="text-secondary-50/50 text-sm mt-1">
            {city}, {state}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-secondary-50/10', className)}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        <Marker latitude={Number(latitude)} longitude={Number(longitude)} anchor="bottom">
          <div className="rounded-full p-2 shadow-lg border-2 bg-primary-500 border-primary-600">
            <FontAwesomeIcon icon={faLocationDot} className="text-white text-lg" />
          </div>
        </Marker>
      </Map>

      <div className="absolute top-4 left-4 bg-secondary-800 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
        <span className="text-sm font-medium text-secondary-50/70">{name}</span>
      </div>
    </div>
  )
}

