'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format, addDays } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { GoogleMapsLink, BookingTypeBadgeInline } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getNextTopOfHour } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface VenueDesignQuickplayProps {
  venue: Venue
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function VenueDesignQuickplay({ venue }: VenueDesignQuickplayProps) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const slotsRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i)
    return {
      date: format(date, 'yyyy-MM-dd'),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE'),
      shortDate: format(date, 'MMM d'),
    }
  })

  const dateFrom = days[0].date
  const dateTo = days[days.length - 1].date

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  const selectedDaySlots = availability?.filter(
    (slot) => slot.date === days[selectedDay].date
  ) || []

  const isSlotBookable = (slotDate: string, slotStartTime: string): boolean => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (slotDate !== todayStr) return true
    const nextHour = getNextTopOfHour()
    const slotStart = parseLocalDate(slotDate)
    const [hours, minutes] = slotStartTime.split(':').map(Number)
    slotStart.setHours(hours, minutes || 0, 0, 0)
    return slotStart >= nextHour
  }

  useEffect(() => {
    if (selectedDaySlots.length > 0 && !selectedSlot) {
      const firstBookable = selectedDaySlots.find((s) =>
        isSlotBookable(s.date, s.start_time)
      )
      if (firstBookable) setSelectedSlot(firstBookable)
    }
  }, [selectedDaySlots, selectedSlot])

  const primaryPhoto = venue.photos?.[0]
  const hourlyRate = venue.hourly_rate

  const handleBookNow = () => {
    if (selectedSlot) setShowBooking(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary-900 via-secondary-900 to-secondary-800">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-secondary-900/95 backdrop-blur-md border-b border-secondary-50/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary-50/10 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-secondary-50/70" />
          </button>

          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-400/30 flex-shrink-0">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={venue.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-secondary-700" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-secondary-50 truncate">{venue.name}</h1>
            <p className="text-xs text-secondary-50/50 truncate">
              ${hourlyRate}/hr
            </p>
          </div>

          <BookingTypeBadgeInline instantBooking={venue.instant_booking} />
        </div>
      </header>

      {/* Day Selector Pills */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {days.map((day, i) => {
            const daySlots = availability?.filter((s) => s.date === day.date) || []
            const hasSlots = daySlots.length > 0

            return (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedDay(i)
                  setSelectedSlot(null)
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedDay === i
                    ? 'bg-primary-400 text-secondary-900 shadow-lg shadow-primary-400/25'
                    : hasSlots
                      ? 'bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/15'
                      : 'bg-secondary-50/5 text-secondary-50/40'
                }`}
                disabled={!hasSlots && loading === false}
              >
                <span className="block">{day.label}</span>
                {selectedDay !== i && (
                  <span className="block text-[10px] opacity-70 mt-0.5">{day.shortDate}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slot Cards */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-24 h-28 rounded-2xl bg-secondary-50/5 animate-pulse"
              />
            ))}
          </div>
        ) : selectedDaySlots.length === 0 ? (
          <div className="text-center py-8 text-secondary-50/50">
            <p className="text-sm">No available slots for this day</p>
          </div>
        ) : (
          <div
            ref={slotsRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          >
            {selectedDaySlots.map((slot, idx) => {
              const isBookable = isSlotBookable(slot.date, slot.start_time)
              const isSelected = selectedSlot?.start_time === slot.start_time && selectedSlot?.date === slot.date
              const startTime = formatTime(slot.start_time)
              const [hours, minutes] = slot.start_time.split(':').map(Number)
              const [endHours] = slot.end_time.split(':').map(Number)
              const duration = endHours - hours

              return (
                <button
                  key={`${slot.date}-${slot.start_time}-${idx}`}
                  onClick={() => isBookable && setSelectedSlot(slot)}
                  disabled={!isBookable}
                  className={`flex-shrink-0 w-24 snap-start rounded-2xl p-3 transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary-400 text-secondary-900 shadow-xl shadow-primary-400/30 scale-105'
                      : isBookable
                        ? 'bg-secondary-50/10 text-secondary-50 hover:bg-secondary-50/15 hover:scale-102'
                        : 'bg-secondary-50/5 text-secondary-50/30'
                  }`}
                >
                  <div className="text-2xl font-bold tracking-tight">
                    {startTime.replace(' ', '')}
                  </div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-secondary-900/70' : 'opacity-60'}`}>
                    {duration}hr · ${hourlyRate * duration}
                  </div>
                </button>
              )
            })}
            <div className="flex-shrink-0 w-4" />
          </div>
        )}
      </div>

      {/* Main Action Area */}
      <div className="px-4 py-6 mt-4">
        {selectedSlot ? (
          <Button
            onClick={handleBookNow}
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary-400 hover:bg-primary-500 text-secondary-900 shadow-xl shadow-primary-400/25 transition-all active:scale-[0.98]"
          >
            Book {formatTime(selectedSlot.start_time)}
            <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
          </Button>
        ) : (
          <div className="h-14 flex items-center justify-center text-secondary-50/40 text-sm">
            Select a time slot above
          </div>
        )}
      </div>

      {/* Venue Info Footer */}
      <div className="px-4 pb-8 space-y-4">
        {/* Address */}
        <GoogleMapsLink
          address={venue.address}
          city={venue.city}
          state={venue.state}
          zipCode={venue.zip_code}
          variant="pill"
          showArrow
        />

        {/* Photo Gallery Preview */}
        {venue.photos && venue.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {venue.photos.slice(0, 4).map((photo, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden"
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
        )}

        {/* Amenities */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {venue.amenities.slice(0, 4).map((amenity, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-secondary-50/5 text-secondary-50/60 text-xs rounded-full"
              >
                {amenity}
              </span>
            ))}
            {venue.amenities.length > 4 && (
              <span className="px-2.5 py-1 text-secondary-50/40 text-xs">
                +{venue.amenities.length - 4} more
              </span>
            )}
          </div>
        )}
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
