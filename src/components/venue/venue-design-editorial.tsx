'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faBolt, faShield } from '@fortawesome/free-solid-svg-icons'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getNextTopOfHour } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface VenueDesignEditorialProps {
  venue: Venue
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function VenueDesignEditorial({ venue }: VenueDesignEditorialProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dateFrom = todayStr
  const dateTo = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  const isSlotBookable = (slotDate: string, slotStartTime: string): boolean => {
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
  }, [availability, todayStr])

  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, ComputedAvailabilitySlot[]>()
    for (const slot of bookableSlots) {
      const existing = grouped.get(slot.date) || []
      grouped.set(slot.date, [...existing, slot])
    }
    return grouped
  }, [bookableSlots])

  const uniqueDates = useMemo(() => {
    return Array.from(slotsByDate.keys()).slice(0, 7)
  }, [slotsByDate])

  const nextSlot = bookableSlots[0]
  const primaryPhoto = venue.photos?.[0]

  const getDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEEE')
  }

  const getShortDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEE')
  }

  const handleDateClick = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date))
  }

  const handleSlotSelect = (slot: ComputedAvailabilitySlot) => {
    setSelectedSlot(slot)
    setShowBooking(true)
  }

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Section */}
      <div className="relative h-[55vh] min-h-[400px]">
        {/* Background Image */}
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 to-secondary-900" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-secondary-900/60 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-900/50 backdrop-blur-md text-secondary-50/80 hover:text-secondary-50 hover:bg-secondary-900/70 transition-all"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        {/* Editorial Typography - extra bottom padding to clear Reserve card */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-16 z-10">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-serif text-4xl sm:text-5xl text-secondary-50 leading-tight mb-2">
              {venue.name}
            </h1>
            <p className="text-secondary-50/60 text-lg">
              {venue.city}, {venue.state}
            </p>
          </div>
        </div>
      </div>

      {/* Content Container - constrained width for desktop */}
      <div className="max-w-2xl mx-auto">
        {/* Floating Booking Card */}
        <div className="relative -mt-8 mx-4 z-20">
          <div className="bg-secondary-800/90 backdrop-blur-xl rounded-2xl border border-secondary-50/10 shadow-glass overflow-hidden">
            {loading ? (
              <div className="p-5">
                <div className="h-6 w-32 bg-secondary-50/10 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-secondary-50/10 rounded animate-pulse" />
              </div>
            ) : nextSlot ? (
              <>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-secondary-50/50 text-xs uppercase tracking-wider mb-1">
                        Next Available
                      </div>
                      <div className="text-2xl font-serif text-secondary-50">
                        {getDateDisplay(nextSlot.date)} · {formatTime(nextSlot.start_time)} - {formatTime(nextSlot.end_time)}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-secondary-50/70">
                          ${venue.hourly_rate}/hr
                        </span>
                        <span className="text-secondary-50/30">·</span>
                        <span className={`flex items-center gap-1 ${venue.instant_booking ? 'text-primary-400' : 'text-accent-400'}`}>
                          <FontAwesomeIcon icon={faBolt} className="text-xs" />
                          <span className="text-sm">
                            {venue.instant_booking ? 'Instant' : 'Approval'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSlotSelect(nextSlot)}
                  className="w-full py-4 bg-primary-400 hover:bg-primary-500 text-secondary-900 font-semibold text-center transition-colors"
                >
                  Reserve
                </button>
              </>
            ) : (
              <div className="p-5 text-center text-secondary-50/50">
                No availability this week
              </div>
            )}
          </div>
        </div>

        {/* Coming Up Section */}
        {uniqueDates.length > 0 && (
          <div className="px-4 mt-6">
            <h3 className="text-sm font-medium text-secondary-50/60 mb-3 tracking-wide uppercase">
              Coming Up
            </h3>
            
            {/* Day Pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {uniqueDates.map((date) => {
                const slots = slotsByDate.get(date) || []
                const isExpanded = expandedDate === date
                return (
                  <button
                    key={date}
                    onClick={() => handleDateClick(date)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-center transition-all ${
                      isExpanded
                        ? 'bg-primary-400 text-secondary-900'
                        : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border border-secondary-50/10'
                    }`}
                  >
                    <div className={`text-sm font-medium ${isExpanded ? '' : ''}`}>
                      {getShortDateDisplay(date)}
                    </div>
                    <div className={`text-xs mt-0.5 ${isExpanded ? 'text-secondary-900/70' : 'text-secondary-50/50'}`}>
                      {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Expanded Time Slots - Accordion */}
            {expandedDate && slotsByDate.get(expandedDate) && (
              <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
                {slotsByDate.get(expandedDate)!.map((slot, idx) => (
                  <button
                    key={`${slot.date}-${slot.start_time}-${idx}`}
                    onClick={() => handleSlotSelect(slot)}
                    className="w-full p-4 bg-secondary-800/50 hover:bg-secondary-800 rounded-xl border border-secondary-50/5 hover:border-primary-400/30 text-left transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-secondary-50 font-medium group-hover:text-primary-400 transition-colors">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </div>
                      <div className="text-xs text-secondary-50/40 mt-0.5">
                        ${venue.hourly_rate}/hr
                      </div>
                    </div>
                    <div className="text-sm text-secondary-50/30 group-hover:text-primary-400 transition-colors">
                      Book →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="px-4 py-8 space-y-8">
          {/* Location */}
          <section>
            <h2 className="font-serif text-xl text-secondary-50 mb-3">Location</h2>
            <GoogleMapsLink
              address={venue.address}
              city={venue.city}
              state={venue.state}
              zipCode={venue.zip_code}
              variant="default"
              showArrow
            />
          </section>

          {/* About */}
          {venue.description && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">About</h2>
              <p className="text-secondary-50/70 leading-relaxed">
                {venue.description}
              </p>
            </section>
          )}

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-secondary-50/5 text-secondary-50/70 text-sm rounded-full border border-secondary-50/5"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Insurance Notice */}
          {venue.insurance_required && (
            <section className="flex items-start gap-3 p-4 bg-accent-400/5 rounded-xl border border-accent-400/10">
              <FontAwesomeIcon icon={faShield} className="text-accent-400 mt-0.5" />
              <div>
                <div className="text-secondary-50 font-medium text-sm">
                  Insurance Required
                </div>
                <div className="text-secondary-50/50 text-xs mt-0.5">
                  Proof of insurance must be verified before booking is confirmed
                </div>
              </div>
            </section>
          )}

          {/* Photo Gallery */}
          {venue.photos && venue.photos.length > 1 && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">Gallery</h2>
              <div className="grid grid-cols-2 gap-2">
                {venue.photos.slice(1, 5).map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden"
                  >
                    <Image
                      src={photo}
                      alt={`${venue.name} photo ${i + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
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
