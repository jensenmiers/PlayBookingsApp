'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useVenues, useVenue, useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { TimeSlotGrid, type TimeSlot } from '@/components/book/time-slot-grid'
import { TimeSlotConfirmationDialog } from '@/components/book/time-slot-confirmation-dialog'
import { EmptyAvailabilityState } from '@/components/book/empty-availability-state'
import { format, addDays, isToday } from 'date-fns'

function generateHourlySlots(): TimeSlot[] {
  const slots: TimeSlot[] = []
  for (let hour = 6; hour < 22; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00:00`
    const end = `${(hour + 1).toString().padStart(2, '0')}:00:00`
    
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

function isSlotAvailable(
  slot: TimeSlot,
  date: Date,
  availability: ComputedAvailabilitySlot[] | null
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  
  const hasAvailability = availability?.some(
    (avail) =>
      avail.date === dateStr &&
      avail.start_time <= slot.start &&
      avail.end_time >= slot.end
  ) ?? false

  if (!hasAvailability) return false

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

  const allSlots = useMemo(() => generateHourlySlots(), [])

  const availableSlots = useMemo(() => {
    if (!selectedVenueId || !selectedDate) return []
    
    return allSlots.filter((slot) =>
      isSlotAvailable(slot, selectedDate, availability)
    )
  }, [allSlots, selectedDate, availability, selectedVenueId])

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot)
    setShowConfirmationDialog(true)
  }

  const handleConfirm = () => {
    console.log('Booking confirmed:', {
      venueId: selectedVenueId,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
    })
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
    <div className="min-h-screen bg-secondary-50">
      {/* Venue Selection & Location Bar */}
      <section className="px-4 pt-6 pb-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary-700 mb-2 block">Select Venue</label>
            {venuesLoading ? (
              <div className="flex items-center justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-600" />
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
            <Button className="w-full bg-white rounded-full px-6 py-4 shadow-soft flex items-center justify-center space-x-3 hover:bg-secondary-50 transition duration-200 text-secondary-800 font-medium">
              <FontAwesomeIcon icon={faLocationDot} className="text-secondary-600" />
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
                      ? 'bg-secondary-600 text-white hover:bg-secondary-700 font-semibold'
                      : 'bg-white text-secondary-700 hover:bg-secondary-50 border-2 border-secondary-200'
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
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-secondary-600">
            Please select a venue to view availability
          </div>
        ) : availabilityLoading ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-600 text-2xl mb-4" />
            <p className="text-secondary-600">Loading availability...</p>
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

