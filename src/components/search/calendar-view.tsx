'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useVenues, useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { format, addDays, isSameDay } from 'date-fns'
import { type CreateBookingFormResumeState } from '@/lib/auth/authResume'
import { useCreateBookingFormAuthResume } from '@/lib/auth/useAuthResume'

// Define time slots (2-hour blocks)
const timeSlots = [
  { label: '6a–8a', start: '06:00:00', end: '08:00:00' },
  { label: '8a–10a', start: '08:00:00', end: '10:00:00' },
  { label: '12p–2p', start: '12:00:00', end: '14:00:00' },
  { label: '2p–4p', start: '14:00:00', end: '16:00:00' },
  { label: '6p–8p', start: '18:00:00', end: '20:00:00' },
  { label: '8p–10p', start: '20:00:00', end: '22:00:00' },
]

const stripedAccent = 'color-mix(in oklch, var(--secondary-500) 28%, transparent)'
const stripedGradientStart = 'color-mix(in oklch, var(--secondary-50) 45%, transparent)'
const stripedGradientEnd = 'color-mix(in oklch, var(--secondary-100) 40%, transparent)'

const stripedBgStyle: React.CSSProperties = {
  backgroundImage:
    `repeating-linear-gradient(45deg, transparent, transparent 2px, ${stripedAccent} 2px, ${stripedAccent} 4px)`,
  background:
    `linear-gradient(to bottom right, ${stripedGradientStart}, ${stripedGradientEnd}), repeating-linear-gradient(45deg, transparent, transparent 2px, ${stripedAccent} 2px, ${stripedAccent} 4px)`,
}

export function CalendarView() {
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<typeof timeSlots[0] | null>(null)
  const [resumedBookingForm, setResumedBookingForm] = useState<CreateBookingFormResumeState | null>(null)

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

  const handleResumeBookingForm = useCallback((resumeState: CreateBookingFormResumeState) => {
    setSelectedVenueId(resumeState.venueId)
    setResumedBookingForm(resumeState)
    setShowBookingForm(true)
  }, [])

  useCreateBookingFormAuthResume({
    canResume: () => true,
    onResume: handleResumeBookingForm,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Venue Selection & Location Bar */}
      <section className="px-l pt-xl pb-l">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-secondary-50/70 mb-s block">Select Venue</label>
            {venuesLoading ? (
              <div className="flex items-center justify-center py-l">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-secondary-50/60" />
              </div>
            ) : (
              <select
                value={selectedVenueId || ''}
                onChange={(e) => setSelectedVenueId(e.target.value || null)}
                className="flex h-11 w-full rounded-lg border border-input bg-secondary-800 px-l py-s text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
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
            <Button className="w-full bg-secondary-800 rounded-full px-xl py-l shadow-soft flex items-center justify-center space-x-3 hover:bg-secondary-50/10 transition duration-200 text-secondary-50 font-medium">
              <FontAwesomeIcon icon={faLocationDot} className="text-secondary-50/60" />
              <span>
                {venues.find((v) => v.id === selectedVenueId)?.name || 'Current location'}
              </span>
            </Button>
          )}
        </div>
      </section>

      {/* Availability Grid */}
      <section className="px-l pb-xl">
        {!selectedVenueId ? (
          <div className="bg-secondary-800 rounded-2xl shadow-soft p-2xl text-center text-secondary-50/60">
            Please select a venue to view availability
          </div>
        ) : (
          <div className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-5 bg-secondary-50/5">
              <div className="p-l border-r border-secondary-50/10"></div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className="p-l text-center border-r border-secondary-50/10 last:border-r-0"
                >
                  <h3 className="font-bold text-secondary-50 text-sm">
                    {format(day, 'EEE')}
                  </h3>
                  <p className="text-xs text-secondary-50/60 mt-xs">{format(day, 'MMM d')}</p>
                </div>
              ))}
            </div>

            {/* Time Rows */}
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot.label}
                className="grid grid-cols-5 border-b border-secondary-50/10 last:border-b-0"
                style={{ minHeight: '80px' }}
              >
                {/* Time Label */}
                <div className="p-l bg-secondary-50/5 border-r border-secondary-50/10 flex items-center">
                  <span className="text-sm font-medium text-secondary-50/70">{timeSlot.label}</span>
                </div>

                {/* Day Cells */}
                {days.map((day) => {
                  const hasAvailability = isSlotAvailable(day, timeSlot)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={`${timeSlot.label}-${day.toISOString()}`}
                      className={`p-m border-r border-secondary-50/10 last:border-r-0 ${
                        hasAvailability ? '' : 'bg-secondary-50/5'
                      } ${isToday ? 'bg-primary-50/50' : ''}`}
                      style={!hasAvailability ? stripedBgStyle : undefined}
                    >
                      {hasAvailability ? (
                        <Button
                          onClick={() => handleAvailabilityClick(day, timeSlot)}
                          className="w-full h-full bg-secondary-800 rounded-xl shadow-soft hover:shadow-glass transition duration-200 flex items-center justify-center min-h-[50px] border-2 border-transparent hover:border-secondary-50/10"
                        >
                          <span className="text-xs font-medium text-secondary-50/70 text-center px-s">
                            Available
                          </span>
                        </Button>
                      ) : (
                        <div className="w-full h-full min-h-[50px] flex items-center justify-center">
                          <span className="text-xs text-secondary-50/40">Unavailable</span>
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
      {showBookingForm && selectedVenueId && ((selectedDate && selectedTimeSlot) || resumedBookingForm) && (
        <CreateBookingForm
          venueId={selectedVenueId}
          initialDate={resumedBookingForm ? new Date(resumedBookingForm.date.replace(/-/g, '/')) : selectedDate!}
          initialStartTime={resumedBookingForm?.startTime ?? selectedTimeSlot?.start}
          initialEndTime={resumedBookingForm?.endTime ?? selectedTimeSlot?.end}
          initialRecurringType={resumedBookingForm?.recurringType}
          initialNotes={resumedBookingForm?.notes}
          open={showBookingForm}
          onOpenChange={(open) => {
            setShowBookingForm(open)
            if (!open) {
              setSelectedDate(null)
              setSelectedTimeSlot(null)
              setResumedBookingForm(null)
            }
          }}
          onSuccess={() => {
            setShowBookingForm(false)
            setSelectedDate(null)
            setSelectedTimeSlot(null)
            setResumedBookingForm(null)
          }}
        />
      )}
    </div>
  )
}
