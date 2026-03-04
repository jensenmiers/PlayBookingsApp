'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faShield } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange } from '@/hooks/useVenues'
import { formatTime } from '@/utils/dateHelpers'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import type { Venue } from '@/types'

interface VenueDesignScoreboardProps {
  venue: Venue
}

export function VenueDesignScoreboard({ venue }: VenueDesignScoreboardProps) {
  const router = useRouter()
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [showBooking, setShowBooking] = useState(false)
  const bookingMode = getBookingModeDisplay(venue.instant_booking, 'compact')

  const today = new Date()
  const dateFrom = format(today, 'yyyy-MM-dd')
  const dateTo = format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  const bookableSlots = availability || []

  const selectedSlot = bookableSlots[selectedSlotIndex]
  const nextAvailable = bookableSlots[0]

  const formatDigitalTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const h = hours % 12 || 12
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return { time: `${h}:${minutes.toString().padStart(2, '0')}`, ampm }
  }

  const getDateLabel = (dateStr: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (dateStr === todayStr) return 'TODAY'
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return format(date, 'EEE').toUpperCase()
  }

  return (
    <div className="min-h-screen bg-secondary-950 text-secondary-50 overflow-hidden">
      {/* LED Strip Top Border */}
      <div className="h-1 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 animate-pulse" />

      {/* Header */}
      <header className="relative px-l py-m border-b border-secondary-50/10">
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-50/60 hover:text-secondary-50"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="text-center font-bold text-lg tracking-[0.2em] uppercase">
          {venue.name}
        </h1>
      </header>

      {/* Main Scoreboard Display */}
      <div className="relative px-l pt-xl pb-l">
        {/* Glow Effect Background */}
        <div className="absolute inset-0 bg-gradient-radial from-primary-400/10 via-transparent to-transparent pointer-events-none" />

        {/* Next Available Label */}
        <div className="text-center mb-s">
          <span className="text-[10px] tracking-[0.4em] text-secondary-50/40 uppercase">
            Next Available
          </span>
        </div>

        {/* Big Digital Time Display */}
        {loading ? (
          <div className="text-center py-2xl">
            <div className="inline-block w-32 h-16 bg-secondary-50/5 rounded animate-pulse" />
          </div>
        ) : nextAvailable ? (
          <div className="text-center">
            <div className="inline-flex items-baseline gap-xs">
              <span
                className="text-6xl sm:text-7xl font-bold tracking-tight"
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  textShadow:
                    '0 0 40px color-mix(in oklch, var(--primary-400) 40%, transparent)',
                }}
              >
                {formatDigitalTime(nextAvailable.start_time).time}
              </span>
              <span className="text-2xl font-medium text-primary-400">
                {formatDigitalTime(nextAvailable.start_time).ampm}
              </span>
            </div>
            <div className="mt-xs text-lg font-semibold text-primary-400 tracking-wider">
              {getDateLabel(nextAvailable.date)}
            </div>
          </div>
        ) : (
          <div className="text-center py-2xl text-secondary-50/40">
            <span className="text-2xl">NO AVAILABILITY</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-px bg-secondary-50/10 mx-l rounded-lg overflow-hidden">
        <div className="bg-secondary-900 p-m text-center">
          <div className="text-2xl font-bold text-secondary-50">${venue.hourly_rate}</div>
          <div className="text-[10px] text-secondary-50/50 uppercase tracking-wider">Per Hour</div>
        </div>
        <div className="bg-secondary-900 p-m text-center">
          <div className="flex items-center justify-center gap-s">
            <FontAwesomeIcon
              icon={bookingMode.icon}
              className={bookingMode.mode === 'instant' ? 'text-primary-400' : 'text-accent-400'}
            />
            <span className="text-sm font-medium">
              {bookingMode.label}
            </span>
          </div>
          <div className="text-[10px] text-secondary-50/50 uppercase tracking-wider mt-xs">
            Booking Type
          </div>
        </div>
        <div className="bg-secondary-900 p-m text-center">
          <GoogleMapsLink
            address={venue.address}
            city={venue.city}
            state={venue.state}
            zipCode={venue.zip_code}
            variant="minimal"
            showIcon={false}
            className="text-sm font-medium block truncate"
          />
          <div className="text-[10px] text-secondary-50/50 uppercase tracking-wider mt-xs">
            Location
          </div>
        </div>
      </div>

      {/* Timeline Selector */}
      <div className="px-l py-xl">
        <div className="text-[10px] tracking-[0.3em] text-secondary-50/40 uppercase mb-m">
          Available Sessions
        </div>

        {loading ? (
          <div className="flex gap-m justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-secondary-50/10 animate-pulse" />
            ))}
          </div>
        ) : bookableSlots.length > 0 ? (
          <>
            {/* Dot Timeline */}
            <div className="flex items-center justify-start gap-s overflow-x-auto pb-s scrollbar-hide">
              {bookableSlots.slice(0, 12).map((slot, idx) => (
                <button
                  key={`${slot.date}-${slot.start_time}`}
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`flex-shrink-0 transition-all duration-200 ${
                    idx === selectedSlotIndex
                      ? 'w-4 h-4 bg-primary-400 shadow-lg shadow-primary-400/50'
                      : 'w-3 h-3 bg-secondary-50/30 hover:bg-secondary-50/50'
                  } rounded-full`}
                />
              ))}
              {bookableSlots.length > 12 && (
                <span className="text-xs text-secondary-50/40 ml-xs">
                  +{bookableSlots.length - 12}
                </span>
              )}
            </div>

            {/* Time Labels */}
            <div className="flex gap-s mt-m overflow-x-auto scrollbar-hide">
              {bookableSlots.slice(0, 12).map((slot, idx) => {
                const isSelected = idx === selectedSlotIndex
                return (
                  <button
                    key={`label-${slot.date}-${slot.start_time}`}
                    onClick={() => setSelectedSlotIndex(idx)}
                    className={`flex-shrink-0 px-s py-xs rounded text-xs transition-all ${
                      isSelected
                        ? 'bg-primary-400/20 text-primary-400 font-medium'
                        : 'text-secondary-50/50 hover:text-secondary-50/80'
                    }`}
                  >
                    {formatTime(slot.start_time).replace(' ', '')}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center text-secondary-50/40 py-l">
            No available slots
          </div>
        )}
      </div>

      {/* Book Now Button */}
      <div className="px-l pb-xl">
        <Button
          onClick={() => selectedSlot && setShowBooking(true)}
          disabled={!selectedSlot}
          className="w-full h-14 text-lg font-bold tracking-wider uppercase bg-primary-400 hover:bg-primary-500 text-secondary-900 rounded-lg shadow-xl shadow-primary-400/25 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          Book Now
        </Button>
      </div>

      {/* Insurance Notice */}
      {venue.insurance_required && (
        <div className="px-l pb-l">
          <div className="flex items-center justify-center gap-s text-xs text-secondary-50/40">
            <FontAwesomeIcon icon={faShield} />
            <span>Insurance verification required</span>
          </div>
        </div>
      )}

      {/* LED Strip Bottom Border */}
      <div className="h-1 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 animate-pulse" />

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
          }}
        />
      )}
    </div>
  )
}
