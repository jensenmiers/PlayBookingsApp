'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useVenues, useVenue } from '@/hooks/useVenues'
import { useVenueAvailabilityRange } from '@/hooks/useVenues'
import { useBookings } from '@/hooks/useBookings'
import { TimeSlotGrid, type TimeSlot } from '@/components/book/time-slot-grid'
import { TimeSlotConfirmationDialog } from '@/components/book/time-slot-confirmation-dialog'
import { EmptyAvailabilityState } from '@/components/book/empty-availability-state'
import { format, addDays, isToday } from 'date-fns'
import { checkTimeOverlap } from '@/utils/conflictDetection'
import type { Availability, Booking } from '@/types'

/**
 * Generate hourly time slots (6 AM - 10 PM)
 */
function generateHourlySlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let hour = 6; hour < 22; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00:00`
    const end = `${(hour + 1).toString().padStart(2, '0')}:00:00`
    
    // Format display time (12-hour format)
    const displayHour = hour % 12 || 12
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const display = `${displayHour}:00 ${ampm}`
    
    slots.push({
      start,
      end,
      display,
      hour,
    })
  }
  return slots
}

/**
 * Check if a time slot is available
 */
function isSlotAvailable(
  slot: TimeSlot,
  date: Date,
  availability: Availability[] | null,
  bookings: Booking[] | null
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // Check if there's availability for this day and time
  const hasAvailability = availability?.some(
    (avail) =>
      avail.date === dateStr &&
      avail.start_time <= slot.start &&
      avail.end_time >= slot.end &&
      avail.is_available
  ) ?? false

  if (!hasAvailability) return false

  // Check if there's a conflicting booking (only pending and confirmed)
  const hasConflict = bookings?.some((booking) => {
    if (booking.date !== dateStr) return false
    if (booking.status !== 'pending' && booking.status !== 'confirmed') return false
    
    // Check for time overlap
    return checkTimeOverlap(slot.start, slot.end, booking.start_time, booking.end_time)
  }) ?? false

  if (hasConflict) return false

  // Check if slot is in the past (for today only)
  if (isToday(date)) {
    const now = new Date()
    const slotDateTime = new Date(`${dateStr}T${slot.start}`)
    if (slotDateTime < now) return false
  }

  return true
}

export function CalendarView() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0) // 0 = today, 1 = tomorrow, 2 = day after
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)

  const { data: venues, loading: venuesLoading } = useVenues()
  const { data: selectedVenue } = useVenue(selectedVenueId)
  
  // Get dates for today + next 2 days (3 days total)
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 3 }, (_, i) => addDays(today, i))
  }, [])

  const selectedDate = days[selectedDateIndex]
  const dateFrom = format(days[0], 'yyyy-MM-dd')
  const dateTo = format(days[days.length - 1], 'yyyy-MM-dd')

  const { data: availability, loading: availabilityLoading } = useVenueAvailabilityRange(
    selectedVenueId,
    dateFrom,
    dateTo
  )

  // Get bookings for the selected venue to check conflicts
  const { data: bookings } = useBookings({
    venue_id: selectedVenueId || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  })

  // Generate all hourly slots
  const allSlots = useMemo(() => generateHourlySlots(), [])

  // Filter available slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedVenueId || !selectedDate) return []
    
    return allSlots.filter((slot) =>
      isSlotAvailable(slot, selectedDate, availability, bookings)
    )
  }, [allSlots, selectedDate, availability, bookings, selectedVenueId])

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot)
    setShowConfirmationDialog(true)
  }

  const handleConfirm = () => {
    // Placeholder - actual booking creation will be implemented later
    console.log('Booking confirmed:', {
      venueId: selectedVenueId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
    })
    // For now, just close the dialog
    setShowConfirmationDialog(false)
    setSelectedTimeSlot(null)
  }

  const handleViewTomorrow = () => {
    if (selectedDateIndex < days.length - 1) {
      setSelectedDateIndex(selectedDateIndex + 1)
    }
  }

  // Auto-select first venue if available
  React.useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id)
    }
  }, [venues, selectedVenueId])

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Venue Selection & Location Bar */}
      <section className="px-4 pt-6 pb-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary-700 mb-2 block">Select Venue</label>
            {venuesLoading ? (
              <div className="flex items-center justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600" />
              </div>
            ) : (
              <select
                value={selectedVenueId || ''}
                onChange={(e) => setSelectedVenueId(e.target.value || null)}
                className="flex h-11 w-full rounded-lg border border-input bg-white/80 px-4 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
              >
                <option value="">Select a venue</option>
                {venues?.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} - {venue.city}, {venue.state}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedVenueId && selectedVenue && (
            <Button className="w-full bg-white rounded-full px-6 py-4 shadow-soft flex items-center justify-center space-x-3 hover:bg-primary-50 transition duration-200 text-primary-800 font-medium">
              <FontAwesomeIcon icon={faLocationDot} className="text-primary-600" />
              <span>{selectedVenue.name}</span>
            </Button>
          )}
        </div>
      </section>

      {/* Date Navigation Tabs */}
      {selectedVenueId && (
        <section className="px-4 pb-4">
          <div className="flex gap-2">
            {days.map((day, index) => {
              const isSelected = index === selectedDateIndex
              const isTodayDate = isToday(day)
              
              return (
                <Button
                  key={day.toISOString()}
                  onClick={() => setSelectedDateIndex(index)}
                  className={`flex-1 rounded-xl py-3 transition duration-200 ${
                    isSelected
                      ? 'bg-primary-600 text-white hover:bg-primary-700 font-semibold'
                      : 'bg-white text-primary-700 hover:bg-primary-50 border-2 border-primary-200'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-medium">
                      {isTodayDate ? 'Today' : format(day, 'EEE')}
                    </span>
                    <span className="text-sm mt-1">{format(day, 'MMM d')}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </section>
      )}

      {/* Availability Display */}
      <section className="px-4 pb-6">
        {!selectedVenueId ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-primary-600">
            Please select a venue to view availability
          </div>
        ) : availabilityLoading ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-primary-600 text-2xl mb-4" />
            <p className="text-primary-600">Loading availability...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <EmptyAvailabilityState onViewTomorrow={handleViewTomorrow} />
        ) : (
          <TimeSlotGrid
            slots={availableSlots}
            selectedSlot={selectedTimeSlot}
            onSelect={handleTimeSlotSelect}
            venue={selectedVenue}
            loading={availabilityLoading}
          />
        )}
      </section>

      {/* Confirmation Dialog */}
      {selectedVenue && selectedDate && selectedTimeSlot && (
        <TimeSlotConfirmationDialog
          open={showConfirmationDialog}
          onOpenChange={setShowConfirmationDialog}
          venue={selectedVenue}
          date={selectedDate}
          timeSlot={selectedTimeSlot}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}

