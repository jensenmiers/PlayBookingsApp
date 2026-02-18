'use client'

import { useState } from 'react'
import { format } from 'date-fns'

/**
 * Parse a date string (YYYY-MM-DD) as local midnight to avoid UTC timezone issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}
import { Button } from '@/components/ui/button'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getNextTopOfHour } from '@/utils/dateHelpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faCalendarDays, faSpinner } from '@fortawesome/free-solid-svg-icons'
import type { Venue } from '@/types'

interface AvailabilitySlotsListProps {
  venue: Venue
}

interface BookingSlot {
  date: string
  start_time: string
  end_time: string
  slot: ComputedAvailabilitySlot
}

export function AvailabilitySlotsList({ venue }: AvailabilitySlotsListProps) {
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)

  const today = new Date()
  const dateFrom = format(today, 'yyyy-MM-dd')
  const dateTo = format(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const { data: availability, loading, error, refetch } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  // Group availability by date and format for display
  const groupedSlots: Record<string, BookingSlot[]> = {}
  if (availability) {
    availability.forEach((slot) => {
      if (!groupedSlots[slot.date]) {
        groupedSlots[slot.date] = []
      }
      groupedSlots[slot.date].push({
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot: slot,
      })
    })
  }

  const sortedDates = Object.keys(groupedSlots).sort()

  /**
   * Check if a slot is bookable (not in the past)
   * For today's slots, only slots starting at or after the next top-of-hour are bookable
   * Future dates are always bookable
   */
  const isSlotBookable = (slotDate: string, slotStartTime: string): boolean => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (slotDate !== todayStr) return true // Future dates are always bookable

    const nextHour = getNextTopOfHour()
    const slotStart = parseLocalDate(slotDate)
    const [hours, minutes] = slotStartTime.split(':').map(Number)
    slotStart.setHours(hours, minutes || 0, 0, 0)

    return slotStart >= nextHour
  }

  const handleBookNow = (slot: BookingSlot) => {
    setSelectedSlot(slot)
    setShowBookingForm(true)
  }

  const handleBookingSuccess = () => {
    setShowBookingForm(false)
    setSelectedSlot(null)
    // Refetch availability to reflect the new booking
    refetch()
  }

  if (loading) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-8 text-center">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-50/60 text-2xl mb-4" />
        <p className="text-secondary-50/60">Loading availability...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-6">
        <p className="text-destructive text-sm">Failed to load availability: {error}</p>
      </div>
    )
  }

  if (sortedDates.length === 0) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-8 text-center">
        <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/30 text-4xl mb-4" />
        <p className="text-secondary-50/60 font-medium mb-2">No availability found</p>
        <p className="text-secondary-50/50 text-sm">
          There are no available time slots for this venue in the next 14 days.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-6">
        <h3 className="text-xl font-bold text-secondary-50 mb-4">Available Time Slots</h3>
        <p className="text-sm text-secondary-50/60 mb-6">
          Select a time slot and click &quot;Book Now&quot; to reserve this venue.
        </p>

        <div className="space-y-6">
          {sortedDates.map((date) => {
            const slots = groupedSlots[date]
            const displayDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')

            return (
              <div key={date} className="border-b border-secondary-50/10 last:border-b-0 pb-6 last:pb-0">
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/60" />
                  <h4 className="font-semibold text-secondary-50">{displayDate}</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot, idx) => {
                    const startTime = formatTime(slot.start_time)
                    const endTime = formatTime(slot.end_time)
                    const timeDisplay = `${startTime} - ${endTime}`
                    const isBookable = isSlotBookable(slot.date, slot.start_time)

                    return (
                      <div
                        key={`${slot.date}-${slot.start_time}-${idx}`}
                        className={`flex items-center justify-between p-4 bg-secondary-50/5 rounded-xl border border-secondary-50/10 transition-colors ${
                          isBookable
                            ? 'hover:border-secondary-50/10'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon
                            icon={faClock}
                            className={isBookable ? 'text-secondary-50/60' : 'text-secondary-50/40'}
                          />
                          <span
                            className={`font-medium ${isBookable ? 'text-secondary-50' : 'text-secondary-50/50'}`}
                          >
                            {timeDisplay}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleBookNow(slot)}
                          disabled={!isBookable}
                          className="bg-secondary-600 hover:bg-secondary-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Book Now
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      {showBookingForm && selectedSlot && (
        <SlotBookingConfirmation
          venue={venue}
          date={selectedSlot.date}
          startTime={selectedSlot.start_time}
          endTime={selectedSlot.end_time}
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          onSuccess={handleBookingSuccess}
        />
      )}
    </>
  )
}

