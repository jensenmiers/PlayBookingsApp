'use client'

import { useCallback, useState } from 'react'
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
import { formatTime } from '@/utils/dateHelpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faCalendarDays, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useSlotBookingAuthResume } from '@/lib/auth/useAuthResume'
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

  const handleResumeSlotBooking = useCallback((slot: ComputedAvailabilitySlot) => {
    setSelectedSlot({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      slot,
    })
    setShowBookingForm(true)
  }, [])

  useSlotBookingAuthResume({
    venueId: venue.id,
    slots: availability || [],
    loading,
    onResume: handleResumeSlotBooking,
  })

  const sortedDates = Object.keys(groupedSlots).sort()

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
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-2xl text-center">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-50/60 text-2xl mb-l" />
        <p className="text-secondary-50/60">Loading availability...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-xl">
        <p className="text-destructive text-sm">Failed to load availability: {error}</p>
      </div>
    )
  }

  if (sortedDates.length === 0) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-2xl text-center">
        <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/30 text-4xl mb-l" />
        <p className="text-secondary-50/60 font-medium mb-s">No availability found</p>
        <p className="text-secondary-50/50 text-sm">
          There are no available time slots for this venue in the next 14 days.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-xl">
        <h3 className="text-xl font-bold text-secondary-50 mb-l">Available Time Slots</h3>
        <p className="text-sm text-secondary-50/60 mb-xl">
          Select a time slot and click &quot;Book Now&quot; to reserve this venue.
        </p>

        <div className="space-y-6">
          {sortedDates.map((date) => {
            const slots = groupedSlots[date]
            const displayDate = format(parseLocalDate(date), 'EEEE, MMMM d, yyyy')

            return (
              <div key={date} className="border-b border-secondary-50/10 last:border-b-0 pb-xl last:pb-0">
                <div className="flex items-center gap-s mb-l">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/60" />
                  <h4 className="font-semibold text-secondary-50">{displayDate}</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-m">
                  {slots.map((slot, idx) => {
                    const startTime = formatTime(slot.start_time)
                    const endTime = formatTime(slot.end_time)
                    const timeDisplay = `${startTime} - ${endTime}`

                    return (
                      <div
                        key={`${slot.date}-${slot.start_time}-${idx}`}
                        className="flex items-center justify-between p-l bg-secondary-50/5 rounded-xl border border-secondary-50/10 transition-colors hover:border-secondary-50/10"
                      >
                        <div className="flex items-center gap-m">
                          <FontAwesomeIcon
                            icon={faClock}
                            className="text-secondary-50/60"
                          />
                          <span className="font-medium text-secondary-50">
                            {timeDisplay}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleBookNow(slot)}
                          className="bg-secondary-600 hover:bg-secondary-700 text-secondary-50 text-sm px-l py-s rounded-lg"
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
          slotActionType={selectedSlot.slot.action_type}
          slotInstanceId={selectedSlot.slot.slot_instance_id}
          slotModalContent={selectedSlot.slot.modal_content}
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          onSuccess={handleBookingSuccess}
        />
      )}
    </>
  )
}
