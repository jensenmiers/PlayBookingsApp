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
  faCheck,
  faHeart,
  faMapPin,
  faCalendarDays,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getNextTopOfHour } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface VenueDesignCommunityProps {
  venue: Venue
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function VenueDesignCommunity({ venue }: VenueDesignCommunityProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)

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

  const todaySlots = bookableSlots.filter(
    (s) => s.date === format(new Date(), 'yyyy-MM-dd')
  )

  const primaryPhoto = venue.photos?.[0]

  const getDateLabel = (dateStr: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEE, MMM d')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/50 to-amber-50">
      {/* Warm Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200/50 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-amber-100 transition-colors text-amber-800"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span className="text-sm font-medium text-amber-800/60 tracking-wide">
            Community Courts
          </span>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-pink-50 transition-colors text-pink-400">
            <FontAwesomeIcon icon={faHeart} />
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* Venue Card - Pinned Style */}
        <div className="relative bg-white rounded-2xl shadow-lg shadow-amber-900/10 overflow-hidden border border-amber-100">
          {/* Pin */}
          <div className="absolute top-3 right-3 z-10">
            <div className="w-6 h-6 rounded-full bg-red-400 shadow-md flex items-center justify-center">
              <FontAwesomeIcon icon={faMapPin} className="text-white text-xs" />
            </div>
          </div>

          {/* Photo */}
          <div className="relative h-40">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={venue.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faStar} className="text-4xl text-amber-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h1 className="text-2xl font-bold text-amber-900 mb-2">{venue.name}</h1>

            <GoogleMapsLink
              address={venue.address}
              city={venue.city}
              state={venue.state}
              zipCode={venue.zip_code}
              variant="compact"
              className="text-amber-700/70 hover:text-amber-800 mb-3"
            />

            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-amber-900">
                ${venue.hourly_rate}/hr
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  venue.instant_booking
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <FontAwesomeIcon icon={venue.instant_booking ? faBolt : faClock} />
                {venue.instant_booking ? 'Book Instantly' : 'Requires Approval'}
              </span>
            </div>
          </div>
        </div>

        {/* Availability Card - Event Listing Style */}
        <div className="bg-white rounded-2xl shadow-lg shadow-amber-900/10 overflow-hidden border border-amber-100">
          <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <FontAwesomeIcon icon={faCalendarDays} />
              <span>Open Today</span>
            </div>
          </div>

          <div className="divide-y divide-amber-100">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-amber-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todaySlots.length > 0 ? (
              todaySlots.slice(0, 5).map((slot, idx) => (
                <button
                  key={`${slot.date}-${slot.start_time}-${idx}`}
                  onClick={() => {
                    setSelectedSlot(slot)
                    setShowBooking(true)
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-amber-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <FontAwesomeIcon icon={faCheck} className="text-sm" />
                    </div>
                    <span className="font-medium text-amber-900">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-green-500 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Book
                  </span>
                </button>
              ))
            ) : bookableSlots.length > 0 ? (
              <div className="p-4 text-center">
                <p className="text-amber-600 text-sm mb-2">Nothing left today</p>
                <p className="text-amber-900 font-medium">
                  Next: {getDateLabel(bookableSlots[0].date)} at{' '}
                  {formatTime(bookableSlots[0].start_time)}
                </p>
              </div>
            ) : (
              <div className="p-6 text-center text-amber-600">
                <p>No availability this week</p>
              </div>
            )}

            {todaySlots.length > 5 && (
              <div className="px-4 py-2 text-center text-sm text-amber-600">
                +{todaySlots.length - 5} more slots today
              </div>
            )}
          </div>
        </div>

        {/* More Days */}
        {bookableSlots.length > todaySlots.length && (
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-900/10 overflow-hidden border border-amber-100 p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">Coming Up</h3>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {Array.from(
                new Set(
                  bookableSlots
                    .filter((s) => s.date !== format(new Date(), 'yyyy-MM-dd'))
                    .map((s) => s.date)
                )
              )
                .slice(0, 5)
                .map((date) => {
                  const daySlots = bookableSlots.filter((s) => s.date === date)
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setSelectedSlot(daySlots[0])
                        setShowBooking(true)
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl text-center transition-colors"
                    >
                      <div className="text-sm font-medium text-amber-900">
                        {format(parseLocalDate(date), 'EEE')}
                      </div>
                      <div className="text-xs text-amber-600">
                        {daySlots.length} slots
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Description Card */}
        {venue.description && (
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-900/10 border border-amber-100 p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">About</h3>
            <p className="text-amber-700/80 text-sm leading-relaxed">
              {venue.description}
            </p>
          </div>
        )}

        {/* Amenities Card */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-900/10 border border-amber-100 p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">What's Here</h3>
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map((amenity, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-amber-50 text-amber-800 text-sm rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Insurance Notice */}
        {venue.insurance_required && (
          <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4 flex items-start gap-3">
            <FontAwesomeIcon icon={faShield} className="text-orange-500 mt-0.5" />
            <div>
              <div className="font-medium text-orange-800 text-sm">
                Insurance Required
              </div>
              <div className="text-orange-700/70 text-xs mt-0.5">
                You'll need to verify insurance before your booking is confirmed
              </div>
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        {venue.photos && venue.photos.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-amber-900/10 border border-amber-100 p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">Photos</h3>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {venue.photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden"
                >
                  <Image
                    src={photo}
                    alt={`${venue.name} photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-amber-50 via-amber-50 to-transparent pt-8">
        <Button
          onClick={() => {
            const slotToBook = selectedSlot || bookableSlots[0]
            if (slotToBook) {
              setSelectedSlot(slotToBook)
              setShowBooking(true)
            }
          }}
          disabled={bookableSlots.length === 0}
          className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg shadow-green-500/25 disabled:opacity-50 transition-all"
        >
          {bookableSlots.length > 0 ? 'Book a Time' : 'No Availability'}
        </Button>
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
