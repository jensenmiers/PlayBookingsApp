'use client'

import { useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useCreateBooking } from '@/hooks/useBookings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRequestToBookAuthResume } from '@/lib/auth/useAuthResume'
import { getMinimumAdvanceDate, type VenuePlanningPolicy } from '@/lib/venuePlanning'
import { formatTime, getDateStringInTimeZone } from '@/utils/dateHelpers'
import type { Venue } from '@/types'
import type { RequestToBookResumeState } from '@/lib/auth/authResume'

type RequestPanelStep = 'form' | 'review' | 'success'

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const DEFAULT_START_TIME = '18:00'

function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value
}

function formatApiDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'MMMM d, yyyy')
}

function buildEndTime(startTime: string, durationHours: number): string | null {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + durationHours * 60

  if (!Number.isFinite(endMinutes) || endMinutes >= 24 * 60) {
    return null
  }

  const endHours = Math.floor(endMinutes / 60)
  const endRemainderMinutes = endMinutes % 60
  return `${String(endHours).padStart(2, '0')}:${String(endRemainderMinutes).padStart(2, '0')}:00`
}

function isAuthenticationError(message: string): boolean {
  const normalizedMessage = message.toLowerCase()
  return normalizedMessage.includes('authentication required')
    || normalizedMessage.includes('unauthorized')
    || normalizedMessage.includes('sign in')
}

export function RequestToBookPanel({
  venue,
  venueAdminConfig = null,
}: {
  venue: Venue
  venueAdminConfig?: Partial<VenuePlanningPolicy> | null
}) {
  const today = getDateStringInTimeZone(new Date(), LOS_ANGELES_TIME_ZONE)
  const minimumRequestDate = getMinimumAdvanceDate(today, venueAdminConfig)
  const [step, setStep] = useState<RequestPanelStep>('form')
  const [date, setDate] = useState(minimumRequestDate)
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [durationHours, setDurationHours] = useState('1')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createBooking = useCreateBooking()
  const { user } = useCurrentUser()
  const { openAuthModal } = useAuthModal()

  const parsedDuration = Number(durationHours)
  const endTime = useMemo(
    () => buildEndTime(startTime, parsedDuration),
    [startTime, parsedDuration]
  )
  const estimatedTotal = Number.isFinite(parsedDuration) ? venue.hourly_rate * parsedDuration : 0

  const handleResumeRequest = useCallback((resumeState: RequestToBookResumeState) => {
    setDate(resumeState.date)
    setStartTime(resumeState.startTime)
    setDurationHours(String(resumeState.durationHours))
    setNotes(resumeState.notes)
    setError(null)
    setStep('review')
  }, [])

  useRequestToBookAuthResume({
    venueId: venue.id,
    onResume: handleResumeRequest,
  })

  const handleReview = () => {
    if (!date || !startTime || !Number.isInteger(parsedDuration) || parsedDuration < 1) {
      setError('Choose a date, start time, and duration')
      return
    }

    if (!endTime) {
      setError('Choose a time that ends before midnight')
      return
    }

    setError(null)
    setStep('review')
  }

  const handleSubmit = async () => {
    if (!endTime) {
      setError('Choose a time that ends before midnight')
      setStep('form')
      return
    }

    if (!user) {
      openAuthModal({
        entryMode: 'login',
        contextMessage: 'Sign in to send your request',
        resumeState: {
          type: 'request-to-book',
          venueId: venue.id,
          date,
          startTime,
          durationHours: Number.isInteger(parsedDuration) ? parsedDuration : 1,
          notes: notes.trim(),
        },
      })
      return
    }

    const result = await createBooking.mutate({
      venue_id: venue.id,
      date,
      start_time: toApiTime(startTime),
      end_time: endTime,
      recurring_type: 'none',
      notes: notes.trim() || undefined,
    })

    if (result.error) {
      if (isAuthenticationError(result.error)) {
        openAuthModal({
          entryMode: 'login',
          contextMessage: 'Sign in to send your request',
          resumeState: {
            type: 'request-to-book',
            venueId: venue.id,
            date,
            startTime,
            durationHours: Number.isInteger(parsedDuration) ? parsedDuration : 1,
            notes: notes.trim(),
          },
        })
        return
      }

      setError(result.error)
      return
    }

    if (result.data) {
      setError(null)
      setStep('success')
    }
  }

  if (step === 'success') {
    return (
      <div className="p-xl text-center">
        <p className="font-serif text-2xl text-secondary-50">Request sent</p>
        <p className="mt-s text-sm text-secondary-50/60">
          You&apos;re not booked yet. We&apos;ll follow up after reviewing your request.
        </p>
      </div>
    )
  }

  return (
    <div className="p-xl">
      <div className="space-y-s">
        <p className="font-serif text-2xl text-secondary-50">Request your preferred time</p>
      </div>

      {step === 'form' ? (
        <div className="mt-l space-y-l">
          <div className="grid gap-m sm:grid-cols-3">
            <div className="space-y-xs">
              <label htmlFor="request-date" className="text-xs font-medium text-secondary-50/70">
                Date
              </label>
              <Input
                id="request-date"
                type="date"
                min={minimumRequestDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>

            <div className="space-y-xs">
              <label htmlFor="request-start-time" className="text-xs font-medium text-secondary-50/70">
                Start time
              </label>
              <Input
                id="request-start-time"
                type="time"
                step="3600"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>

            <div className="space-y-xs">
              <label htmlFor="request-duration" className="text-xs font-medium text-secondary-50/70">
                Duration
              </label>
              <div className="relative">
                <Input
                  id="request-duration"
                  type="number"
                  min={1}
                  step={1}
                  value={durationHours}
                  onChange={(event) => setDurationHours(event.target.value)}
                  aria-describedby="request-duration-unit"
                  className="pr-4xl"
                />
                <span
                  id="request-duration-unit"
                  className="pointer-events-none absolute inset-y-0 right-l flex items-center text-sm text-secondary-50/50"
                >
                  hour(s)
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/50 bg-destructive/10 p-m text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="button" className="w-full" onClick={handleReview}>
            Review request
          </Button>
        </div>
      ) : (
        <div className="mt-l space-y-l">
          <div className="rounded-xl border border-secondary-50/10 bg-secondary-900/40 p-l">
            <dl className="space-y-s text-sm">
              <div className="flex items-center justify-between gap-l">
                <dt className="text-secondary-50/50">Date</dt>
                <dd className="font-medium text-secondary-50">{formatApiDate(date)}</dd>
              </div>
              <div className="flex items-center justify-between gap-l">
                <dt className="text-secondary-50/50">Time</dt>
                <dd className="font-medium text-secondary-50">
                  {formatTime(toApiTime(startTime))} - {endTime ? formatTime(endTime) : ''}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-l">
                <dt className="text-secondary-50/50">Activity</dt>
                <dd className="font-medium text-secondary-50">Basketball</dd>
              </div>
              <div className="flex items-center justify-between gap-l border-t border-secondary-50/10 pt-s">
                <dt className="text-secondary-50/50">Estimated total</dt>
                <dd className="font-semibold text-secondary-50">${estimatedTotal.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-xs">
            <label htmlFor="request-notes" className="text-xs font-medium text-secondary-50/70">
              Notes (optional)
            </label>
            <textarea
              id="request-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="flex w-full resize-none rounded-xl border border-input bg-secondary-800/80 px-l py-s text-sm text-secondary-50 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
              placeholder="Add any details the host should know."
            />
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/50 bg-destructive/10 p-m text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-s">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep('form')}
              disabled={createBooking.loading}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSubmit}
              disabled={createBooking.loading}
            >
              {createBooking.loading ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
