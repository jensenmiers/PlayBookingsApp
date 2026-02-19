'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faBolt,
  faClock,
  faShield,
  faChevronUp,
  faLocationDot,
  faImages,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getNextTopOfHour } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface VenueDesignArenaProps {
  venue: Venue
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function VenueDesignArena({ venue }: VenueDesignArenaProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)

  const today = new Date()
  const dateFrom = format(today, 'yyyy-MM-dd')
  const dateTo = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  const isSlotBookable = (slotDate: string, slotStartTime: string): boolean => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (slotDate !== todayStr) return true
    const nextHour = getNextTopOfHour()
    const slotStart = parseLocalDate(slotDate)
    const [hours, minutes] = slotStartTime.split(':').map(Number)
    slotStart.setHours(hours, minutes || 0, 0, 0)
    return slotStart >= nextHour
  }

  const bookableSlots = useMemo(() => {
    if (!availability) return []
    return availability.filter((slot) =>
      isSlotBookable(slot.date, slot.start_time)
    )
  }, [availability])

  const nextSlot = bookableSlots[0]
  const primaryPhoto = venue.photos?.[0]

  const formatShortTime = (timeStr: string) => {
    const [hours] = timeStr.split(':').map(Number)
    const h = hours % 12 || 12
    const ampm = hours >= 12 ? 'pm' : 'am'
    return `${h}${ampm}`
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-secondary-950 relative">
      {/* Full Screen Background */}
      <div className="absolute inset-0">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 to-secondary-950" />
        )}

        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-950 via-transparent to-secondary-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-950/50 via-transparent to-secondary-950/50" />
      </div>

      {/* Floating Back Button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-30 w-12 h-12 flex items-center justify-center rounded-full bg-secondary-950/60 backdrop-blur-md text-secondary-50 hover:bg-secondary-950/80 transition-all"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
      </button>

      {/* Photo Count Badge */}
      {venue.photos && venue.photos.length > 1 && (
        <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-secondary-950/60 backdrop-blur-md text-secondary-50/80 text-sm flex items-center gap-2">
          <FontAwesomeIcon icon={faImages} className="text-xs" />
          <span>{venue.photos.length}</span>
        </div>
      )}

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-500 ease-out ${
          sheetExpanded ? 'h-[70vh]' : 'h-auto'
        }`}
      >
        {/* Sheet Handle & Minimal Info */}
        <div
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="cursor-pointer"
        >
          <div className="bg-gradient-to-t from-secondary-950 via-secondary-950/95 to-transparent pt-12 pb-4 px-6">
            {/* Drag Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-secondary-50/30" />
            </div>

            {/* Venue Name */}
            <h1 className="text-3xl sm:text-4xl font-bold text-secondary-50 mb-2">
              {venue.name}
            </h1>

            {/* Quick Info Row */}
            <div className="flex items-center gap-4 text-secondary-50/70 text-sm">
              {loading ? (
                <div className="h-4 w-24 bg-secondary-50/10 rounded animate-pulse" />
              ) : nextSlot ? (
                <>
                  <span className="font-medium text-secondary-50">
                    Next: {formatShortTime(nextSlot.start_time)}
                  </span>
                  <span className="text-secondary-50/40">·</span>
                </>
              ) : null}
              <span>${venue.hourly_rate}</span>
              <span className="text-secondary-50/40">·</span>
              <span className={`flex items-center gap-1 ${venue.instant_booking ? 'text-primary-400' : 'text-accent-400'}`}>
                <FontAwesomeIcon icon={venue.instant_booking ? faBolt : faClock} className="text-xs" />
                {venue.instant_booking ? 'Instant' : 'Approval'}
              </span>
            </div>

            {/* Expand Indicator */}
            <div className="flex items-center justify-center mt-3 text-secondary-50/40">
              <FontAwesomeIcon
                icon={faChevronUp}
                className={`transition-transform ${sheetExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {sheetExpanded && (
          <div className="bg-secondary-950 px-6 pb-8 overflow-y-auto max-h-[calc(70vh-180px)]">
            {/* Time Slots Grid */}
            <section className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-secondary-50/40 mb-3">
                Available Times
              </h3>
              {loading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-secondary-50/5 animate-pulse" />
                  ))}
                </div>
              ) : bookableSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {bookableSlots.slice(0, 8).map((slot, idx) => {
                    const isSelected = selectedSlot?.start_time === slot.start_time && selectedSlot?.date === slot.date
                    return (
                      <button
                        key={`${slot.date}-${slot.start_time}-${idx}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-primary-400 text-secondary-900'
                            : 'bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/15'
                        }`}
                      >
                        {formatShortTime(slot.start_time)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-secondary-50/50 text-sm">No availability this week</p>
              )}
            </section>

            {/* Location */}
            <section className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-secondary-50/40 mb-3">
                Location
              </h3>
              <GoogleMapsLink
                address={venue.address}
                city={venue.city}
                state={venue.state}
                zipCode={venue.zip_code}
                variant="pill"
                showArrow
              />
            </section>

            {/* About */}
            {venue.description && (
              <section className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-secondary-50/40 mb-3">
                  About
                </h3>
                <p className="text-secondary-50/70 text-sm leading-relaxed">
                  {venue.description}
                </p>
              </section>
            )}

            {/* Amenities */}
            {venue.amenities && venue.amenities.length > 0 && (
              <section className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-secondary-50/40 mb-3">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-secondary-50/5 text-secondary-50/60 text-xs rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Insurance Notice */}
            {venue.insurance_required && (
              <div className="flex items-center gap-2 p-3 bg-accent-400/10 rounded-lg text-accent-400 text-sm">
                <FontAwesomeIcon icon={faShield} />
                <span>Insurance verification required</span>
              </div>
            )}
          </div>
        )}

        {/* Fixed Book Button */}
        <div className="bg-secondary-950 px-6 pb-6 pt-2">
          <Button
            onClick={() => {
              const slotToBook = selectedSlot || nextSlot
              if (slotToBook) {
                setSelectedSlot(slotToBook)
                setShowBooking(true)
              }
            }}
            disabled={!nextSlot && !selectedSlot}
            className="w-full h-14 text-lg font-bold bg-primary-400 hover:bg-primary-500 text-secondary-900 rounded-xl shadow-xl shadow-primary-400/20 disabled:opacity-50 transition-all"
          >
            {selectedSlot
              ? `Book ${formatTime(selectedSlot.start_time)}`
              : nextSlot
                ? `Book ${formatShortTime(nextSlot.start_time)}`
                : 'No Availability'}
          </Button>
        </div>
      </div>

      {/* Booking Dialog */}
      {showBooking && selectedSlot && (
        <SlotBookingConfirmation
          venue={venue}
          date={selectedSlot.date}
          startTime={selectedSlot.start_time}
          endTime={selectedSlot.end_time}
          open={showBooking}
          onOpenChange={setShowBooking}
          onSuccess={() => {
            setShowBooking(false)
            setSelectedSlot(null)
          }}
        />
      )}
    </div>
  )
}
