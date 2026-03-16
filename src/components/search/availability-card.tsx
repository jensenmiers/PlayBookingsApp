'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { AvailabilityWithVenue } from '@/types'
import { calculateDuration } from '@/utils/dateHelpers'
import { CreateBookingForm } from '@/components/forms/create-booking-form'
import { useCallback, useState } from 'react'
import { type CreateBookingFormResumeState } from '@/lib/auth/authResume'
import { useCreateBookingFormAuthResume } from '@/lib/auth/useAuthResume'

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

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function AvailabilityCard({ availability }: AvailabilityCardProps) {
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [resumedBookingForm, setResumedBookingForm] = useState<CreateBookingFormResumeState | null>(null)

  const startTimeDisplay = formatTimeForDisplay(availability.start_time)
  const durationDisplay = formatDuration(availability.start_time, availability.end_time)
  const venue = availability.venue

  const handleResumeBookingForm = useCallback((resumeState: CreateBookingFormResumeState) => {
    setResumedBookingForm(resumeState)
    setShowBookingForm(true)
  }, [])

  useCreateBookingFormAuthResume({
    canResume: (resumeState) => resumeState.venueId === venue.id,
    onResume: handleResumeBookingForm,
  })

  return (
    <>
      <div className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden border border-secondary-50/10">
        <div className="flex items-center p-l gap-l">
          {/* Left Column: Time and Duration */}
          <div className="flex-shrink-0 w-24">
            <div className="text-lg font-bold text-secondary-50">{startTimeDisplay}</div>
            <div className="text-sm text-secondary-50/60">{durationDisplay}</div>
          </div>

          {/* Middle Column: Venue Details */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-secondary-50 mb-xs truncate">{venue.name}</div>
            <div className="text-sm text-secondary-50/60">
              {venue.city}, {venue.state}
            </div>
          </div>

          {/* Right Column: Price and Book Button */}
          <div className="flex-shrink-0 flex flex-col items-end gap-s">
            <div className="text-lg font-bold text-secondary-50">
              ${venue.hourly_rate}
              <span className="text-sm font-normal text-secondary-50/60">/hour</span>
            </div>
            <Button
              onClick={() => setShowBookingForm(true)}
              className="bg-secondary-600 hover:bg-secondary-700 text-secondary-50 font-medium py-s px-l text-sm rounded-xl transition duration-200 whitespace-nowrap"
            >
              Book Now
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Form Dialog */}
      {showBookingForm && (
        <CreateBookingForm
          venueId={resumedBookingForm?.venueId ?? venue.id}
          initialDate={resumedBookingForm ? parseLocalDate(resumedBookingForm.date) : parseLocalDate(availability.date)}
          initialStartTime={resumedBookingForm?.startTime}
          initialEndTime={resumedBookingForm?.endTime}
          initialRecurringType={resumedBookingForm?.recurringType}
          initialNotes={resumedBookingForm?.notes}
          open={showBookingForm}
          onOpenChange={(open) => {
            setShowBookingForm(open)
            if (!open) {
              setResumedBookingForm(null)
            }
          }}
          onSuccess={() => {
            setShowBookingForm(false)
            setResumedBookingForm(null)
          }}
        />
      )}
    </>
  )
}
