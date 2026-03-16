'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
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
import { formatTime } from '@/utils/dateHelpers'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import { useSlotBookingAuthResume } from '@/lib/auth/useAuthResume'
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
  const bookingMode = getBookingModeDisplay(venue.instant_booking, 'full')

  const today = new Date()
  const dateFrom = format(today, 'yyyy-MM-dd')
  const dateTo = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  const bookableSlots = useMemo(() => {
    if (!availability) return []
    return availability
  }, [availability])

  const todaySlots = bookableSlots.filter(
    (s) => s.date === format(new Date(), 'yyyy-MM-dd')
  )

  const primaryPhoto = venue.photos?.[0]

  const handleResumeSlotBooking = useCallback((slot: ComputedAvailabilitySlot) => {
    setSelectedSlot(slot)
    setShowBooking(true)
  }, [])

  useSlotBookingAuthResume({
    venueId: venue.id,
    slots: bookableSlots,
    loading,
    onResume: handleResumeSlotBooking,
  })

  const getDateLabel = (dateStr: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEE, MMM d')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent-50 via-accent-50/50 to-accent-50">
      {/* Warm Header */}
      <header className="bg-secondary-50/80 backdrop-blur-sm border-b border-accent-200/50 sticky top-0 z-50">
        <div className="flex items-center justify-between px-l py-m">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent-100 transition-colors text-accent-800"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span className="text-sm font-medium text-accent-800/60 tracking-wide">
            Community Courts
          </span>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary-50 transition-colors text-primary-400">
            <FontAwesomeIcon icon={faHeart} />
          </button>
        </div>
      </header>

      <div className="px-l py-xl space-y-4">
        {/* Venue Card - Pinned Style */}
        <div className="relative bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 overflow-hidden border border-accent-100">
          {/* Pin */}
          <div className="absolute top-3 right-3 z-10">
            <div className="w-6 h-6 rounded-full bg-destructive/15 shadow-md flex items-center justify-center">
              <FontAwesomeIcon icon={faMapPin} className="text-secondary-50 text-xs" />
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
              <div className="w-full h-full bg-gradient-to-br from-accent-100 to-accent-100 flex items-center justify-center">
                <FontAwesomeIcon icon={faStar} className="text-4xl text-accent-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-l">
            <h1 className="text-2xl font-bold text-accent-900 mb-s">{venue.name}</h1>

            <GoogleMapsLink
              address={venue.address}
              city={venue.city}
              state={venue.state}
              zipCode={venue.zip_code}
              variant="compact"
              className="text-accent-700/70 hover:text-accent-800 mb-m"
            />

            <div className="flex items-center gap-m">
              <span className="text-lg font-semibold text-accent-900">
                ${venue.hourly_rate}/hr
              </span>

                <span
                  className={`inline-flex items-center gap-s px-m py-xs rounded-full text-xs font-medium ${
                  bookingMode.mode === 'instant'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-accent-100 text-accent-700'
                }`}
              >
                <FontAwesomeIcon icon={bookingMode.icon} />
                {bookingMode.label}
              </span>
            </div>
          </div>
        </div>

        {/* Availability Card - Event Listing Style */}
        <div className="bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 overflow-hidden border border-accent-100">
          <div className="px-l py-m bg-gradient-to-r from-primary-50 to-primary-50 border-b border-primary-100">
            <div className="flex items-center gap-s text-primary-700 font-semibold">
              <FontAwesomeIcon icon={faCalendarDays} />
              <span>Open Today</span>
            </div>
          </div>

          <div className="divide-y divide-amber-100">
            {loading ? (
              <div className="p-l space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-accent-50 rounded-lg animate-pulse" />
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
                  className="w-full flex items-center justify-between p-l hover:bg-accent-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-m">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      <FontAwesomeIcon icon={faCheck} className="text-sm" />
                    </div>
                    <span className="font-medium text-accent-900">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                  </div>
                  <span className="px-m py-s rounded-full bg-primary-500 text-secondary-50 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Book
                  </span>
                </button>
              ))
            ) : bookableSlots.length > 0 ? (
              <div className="p-l text-center">
                <p className="text-accent-600 text-sm mb-s">Nothing left today</p>
                <p className="text-accent-900 font-medium">
                  Next: {getDateLabel(bookableSlots[0].date)} at{' '}
                  {formatTime(bookableSlots[0].start_time)}
                </p>
              </div>
            ) : (
              <div className="p-xl text-center text-accent-600">
                <p>No availability this week</p>
              </div>
            )}

            {todaySlots.length > 5 && (
              <div className="px-l py-s text-center text-sm text-accent-600">
                +{todaySlots.length - 5} more slots today
              </div>
            )}
          </div>
        </div>

        {/* More Days */}
        {bookableSlots.length > todaySlots.length && (
          <div className="bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 overflow-hidden border border-accent-100 p-l">
            <h3 className="text-sm font-semibold text-accent-800 mb-m">Coming Up</h3>
            <div className="flex gap-s overflow-x-auto scrollbar-hide">
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
                      className="flex-shrink-0 px-l py-s bg-accent-50 hover:bg-accent-100 rounded-xl text-center transition-colors"
                    >
                      <div className="text-sm font-medium text-accent-900">
                        {format(parseLocalDate(date), 'EEE')}
                      </div>
                      <div className="text-xs text-accent-600">
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
          <div className="bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 border border-accent-100 p-l">
            <h3 className="text-sm font-semibold text-accent-800 mb-s">About</h3>
            <p className="text-accent-700/80 text-sm leading-relaxed">
              {venue.description}
            </p>
          </div>
        )}

        {/* Amenities Card */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 border border-accent-100 p-l">
            <h3 className="text-sm font-semibold text-accent-800 mb-m">What's Here</h3>
            <div className="flex flex-wrap gap-s">
              {venue.amenities.map((amenity, i) => (
                <span
                  key={i}
                  className="px-m py-s bg-accent-50 text-accent-800 text-sm rounded-full"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Insurance Notice */}
        {venue.insurance_required && (
          <div className="bg-accent-50 rounded-2xl border border-accent-200 p-l flex items-start gap-m">
            <FontAwesomeIcon icon={faShield} className="text-accent-500 mt-xxs" />
            <div>
              <div className="font-medium text-accent-800 text-sm">
                Insurance Required
              </div>
              <div className="text-accent-700/70 text-xs mt-xxs">
                You'll need to verify insurance before your booking is confirmed
              </div>
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        {venue.photos && venue.photos.length > 1 && (
          <div className="bg-secondary-50 rounded-2xl shadow-lg shadow-accent-900/10 border border-accent-100 p-l">
            <h3 className="text-sm font-semibold text-accent-800 mb-m">Photos</h3>
            <div className="flex gap-s overflow-x-auto scrollbar-hide">
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
      <div className="sticky bottom-0 p-l bg-gradient-to-t from-accent-50 via-accent-50 to-transparent pt-2xl">
        <Button
          onClick={() => {
            const slotToBook = selectedSlot || bookableSlots[0]
            if (slotToBook) {
              setSelectedSlot(slotToBook)
              setShowBooking(true)
            }
          }}
          disabled={bookableSlots.length === 0}
          className="w-full h-14 text-lg font-semibold bg-primary-500 hover:bg-primary-600 text-secondary-50 rounded-2xl shadow-lg shadow-primary-500/25 disabled:opacity-50 transition-all"
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
          slotActionType={selectedSlot.action_type}
          slotInstanceId={selectedSlot.slot_instance_id}
          slotModalContent={selectedSlot.modal_content}
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
