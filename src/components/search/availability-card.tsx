'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { AvailabilityWithVenue } from '@/types'
import { calculateDuration } from '@/utils/dateHelpers'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { useState } from 'react'

interface AvailabilityCardProps {
  availability: AvailabilityWithVenue
}

/**
 * Format time for display (e.g., "2:00 PM")
 */
function formatTimeForDisplay(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes || 0, 0, 0)
  return format(date, 'h:mm a')
}

/**
 * Format duration for display (e.g., "60 min")
 */
function formatDuration(startTime: string, endTime: string): string {
  const durationHours = calculateDuration(startTime, endTime)
  const durationMinutes = Math.round(durationHours * 60)
  return `${durationMinutes} min`
}

export function AvailabilityCard({ availability }: AvailabilityCardProps) {
  const [showBookingForm, setShowBookingForm] = useState(false)

  const startTimeDisplay = formatTimeForDisplay(availability.start_time)
  const durationDisplay = formatDuration(availability.start_time, availability.end_time)
  const venue = availability.venue

  return (
    <>
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-secondary-100">
        <div className="flex items-center p-4 gap-4">
          {/* Left Column: Time and Duration */}
          <div className="flex-shrink-0 w-24">
            <div className="text-lg font-bold text-secondary-800">{startTimeDisplay}</div>
            <div className="text-sm text-secondary-600">{durationDisplay}</div>
          </div>

          {/* Middle Column: Venue Details */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-secondary-800 mb-1 truncate">{venue.name}</div>
            <div className="text-sm text-secondary-600">
              {venue.city}, {venue.state}
            </div>
          </div>

          {/* Right Column: Price and Book Button */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="text-lg font-bold text-secondary-800">
              ${venue.hourly_rate}
              <span className="text-sm font-normal text-secondary-600">/hour</span>
            </div>
            <Button
              onClick={() => setShowBookingForm(true)}
              className="bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 px-4 text-sm rounded-xl transition duration-200 whitespace-nowrap"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Form Dialog */}
      {showBookingForm && (
        <CreateBookingForm
          venueId={venue.id}
          initialDate={new Date(availability.date)}
          open={showBookingForm}
          onOpenChange={setShowBookingForm}
          onSuccess={() => {
            setShowBookingForm(false)
          }}
        />
      )}
    </>
  )
}



