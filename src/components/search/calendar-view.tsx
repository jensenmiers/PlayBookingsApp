'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useVenues, useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { format, addDays, isSameDay } from 'date-fns'

// Define time slots (2-hour blocks)
const timeSlots = [
  { label: '6a–8a', start: '06:00:00', end: '08:00:00' },
  { label: '8a–10a', start: '08:00:00', end: '10:00:00' },
  { label: '12p–2p', start: '12:00:00', end: '14:00:00' },
  { label: '2p–4p', start: '14:00:00', end: '16:00:00' },
  { label: '6p–8p', start: '18:00:00', end: '20:00:00' },
  { label: '8p–10p', start: '20:00:00', end: '22:00:00' },
]

const stripedBgStyle: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(150, 117, 90, 0.1) 2px, rgba(150, 117, 90, 0.1) 4px)',
  background:
    'linear-gradient(to bottom right, rgba(247, 243, 239, 0.5), rgba(233, 225, 216, 0.5)), repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(150, 117, 90, 0.1) 2px, rgba(150, 117, 90, 0.1) 4px)',
}

export function CalendarView() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<typeof timeSlots[0] | null>(null)

  const { data: venues, loading: venuesLoading } = useVenues()
  
  // Get dates for the next 4 days starting from today
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 4 }, (_, i) => addDays(today, i))
  }, [])

  const dateFrom = format(days[0], 'yyyy-MM-dd')
  const dateTo = format(days[days.length - 1], 'yyyy-MM-dd')

  const { data: availability } = useVenueAvailabilityRange(
    selectedVenueId,
    dateFrom,
    dateTo
  )

  const isSlotAvailable = (day: Date, timeSlot: typeof timeSlots[0]) => {
    if (!selectedVenueId) return false

    const dayStr = format(day, 'yyyy-MM-dd')
    
    const hasAvailability = availability?.some(
      (avail: ComputedAvailabilitySlot) =>
        avail.date === dayStr &&
        avail.start_time <= timeSlot.start &&
        avail.end_time >= timeSlot.end
    )

    return hasAvailability ?? false
  }

  const handleAvailabilityClick = (day: Date, timeSlot: typeof timeSlots[0]) => {
    if (!selectedVenueId) {
      // Prompt to select a venue first
      return
    }
    setSelectedDate(day)
    setSelectedTimeSlot(timeSlot)
    setShowBookingForm(true)
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
          {selectedVenueId && venues && (
            <Button className="w-full bg-white rounded-full px-6 py-4 shadow-soft flex items-center justify-center space-x-3 hover:bg-secondary-50 transition duration-200 text-secondary-800 font-medium">
              <FontAwesomeIcon icon={faLocationDot} className="text-secondary-600" />
              <span>
                {venues.find((v) => v.id === selectedVenueId)?.name || 'Current location'}
              </span>
            </Button>
          )}
        </div>
      </section>

      {/* Availability Grid */}
      <section className="px-4 pb-6">
        {!selectedVenueId ? (
          <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-secondary-600">
            Please select a venue to view availability
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-5 bg-secondary-100">
              <div className="p-4 border-r border-secondary-200"></div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="p-4 text-center border-r border-secondary-200 last:border-r-0"
                >
                  <h3 className="font-bold text-secondary-800 text-sm">
                    {format(day, 'EEE')}
                  </h3>
                  <p className="text-xs text-secondary-600 mt-1">{format(day, 'MMM d')}</p>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot.label}
                className="grid grid-cols-5 border-b border-secondary-100 last:border-b-0"
                style={{ minHeight: '80px' }}
              >
                {/* Time Label */}
                <div className="p-4 bg-secondary-50 border-r border-secondary-200 flex items-center">
                  <span className="text-sm font-medium text-secondary-700">{timeSlot.label}</span>
                </div>

                {/* Day Cells */}
                {days.map((day) => {
                  const hasAvailability = isSlotAvailable(day, timeSlot)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={`${timeSlot.label}-${day.toISOString()}`}
                      className={`p-3 border-r border-secondary-100 last:border-r-0 ${
                        hasAvailability ? '' : 'bg-gradient-to-br from-secondary-50/50 to-secondary-100/50'
                      } ${isToday ? 'bg-blue-50/50' : ''}`}
                      style={!hasAvailability ? stripedBgStyle : undefined}
                    >
                      {hasAvailability ? (
                        <Button
                          onClick={() => handleAvailabilityClick(day, timeSlot)}
                          className="w-full h-full bg-white rounded-xl shadow-soft hover:shadow-glass transition duration-200 flex items-center justify-center min-h-[50px] border-2 border-transparent hover:border-secondary-300"
                        >
                          <span className="text-xs font-medium text-secondary-700 text-center px-2">
                            Available
                          </span>
                        </Button>
                      ) : (
                        <div className="w-full h-full min-h-[50px] flex items-center justify-center">
                          <span className="text-xs text-secondary-400">Unavailable</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Booking Form Dialog */}
      {showBookingForm && selectedVenueId && selectedDate && selectedTimeSlot && (
        <CreateBookingForm
          venueId={selectedVenueId}
          initialDate={selectedDate}
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          onSuccess={() => {
            setShowBookingForm(false)
            setSelectedDate(null)
            setSelectedTimeSlot(null)
          }}
        />
      )}
    </div>
  )
}

