'use client'

import { useCallback, useState } from 'react'
import { usePostHog } from 'posthog-js/react'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { useCreateBooking } from '@/hooks/useBookings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRequestToBookAuthResume } from '@/lib/auth/useAuthResume'
import type { RequestToBookResumeState } from '@/lib/auth/authResume'
import { getMinimumAdvanceDate } from '@/lib/venuePlanning'
import { addDaysToDateString, formatTime, getDateStringInTimeZone } from '@/utils/dateHelpers'
import type { OperatingHourWindow, Venue, VenueAdminConfig } from '@/types'

export type RequestToBookPolicy = Partial<Pick<
  VenueAdminConfig,
  'min_advance_booking_days' | 'min_advance_lead_time_hours' | 'operating_hours' | 'request_hint_windows'
>>

export interface RequestTimeValues {
  date: string
  startTime: string
  endTime: string
}

export const REQUEST_ACTIVITY_OPTIONS = ['Pickup run', 'Team practice', 'Private training', 'Event or party'] as const
export const OTHER_ACTIVITY = 'Other'

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const DEFAULT_START_TIME = '18:00'
const DEFAULT_END_TIME = '19:00'
// Used only when the venue has no operating hours configured at all.
const DEFAULT_OPEN_WINDOW = { open: 6, close: 23 }

export function toHour(time: string): number {
  return Number(time.split(':')[0])
}

export function hourToTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function toApiTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value
}

function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

/** Whole-hour windows the venue accepts on a date. Requests are whole hours (server rule). */
function getOpenWindows(date: string, operatingHours: OperatingHourWindow[]): Array<{ open: number; close: number }> {
  if (operatingHours.length === 0) {
    return [DEFAULT_OPEN_WINDOW]
  }
  const dayOfWeek = date ? getDayOfWeek(date) : -1
  return operatingHours
    .filter((window) => window.day_of_week === dayOfWeek)
    .map((window) => ({
      open: Math.ceil(toHour(window.start_time) + Number(window.start_time.split(':')[1] || 0) / 60),
      close: toHour(window.end_time),
    }))
    .filter((window) => window.close > window.open)
}

function nextDateForWeekday(fromDate: string, weekday: number): string {
  const offset = (weekday - getDayOfWeek(fromDate) + 7) % 7
  return addDaysToDateString(fromDate, offset)
}

function isAuthenticationError(message: string): boolean {
  const normalizedMessage = message.toLowerCase()
  return normalizedMessage.includes('authentication required')
    || normalizedMessage.includes('unauthorized')
    || normalizedMessage.includes('sign in')
}

const isTime = (value: string | undefined): value is string => Boolean(value && /^\d{2}:\d{2}$/.test(value))
const isDate = (value: string | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))

/**
 * All state and rules for a request-to-book request, shared by the venue page card,
 * the phone bottom sheet and the desktop request page.
 */
export function useRequestToBookForm({
  venue,
  venueAdminConfig = null,
  initial,
  onResumed,
}: {
  venue: Venue
  venueAdminConfig?: RequestToBookPolicy | null
  initial?: Partial<RequestTimeValues>
  onResumed?: () => void
}) {
  const today = getDateStringInTimeZone(new Date(), LOS_ANGELES_TIME_ZONE)
  const minimumRequestDate = getMinimumAdvanceDate(today, venueAdminConfig)
  const operatingHours = venueAdminConfig?.operating_hours ?? []
  const hintWindows = venueAdminConfig?.request_hint_windows ?? []

  const { user } = useCurrentUser()
  const posthog = usePostHog()
  const createBooking = useCreateBooking()
  const { openAuthModal } = useAuthModal()

  const [submitted, setSubmitted] = useState(false)
  const [date, setDate] = useState(
    isDate(initial?.date) && initial.date >= minimumRequestDate ? initial.date : minimumRequestDate
  )
  const [startTime, setStartTime] = useState(isTime(initial?.startTime) ? initial.startTime : DEFAULT_START_TIME)
  const [endTime, setEndTime] = useState(isTime(initial?.endTime) ? initial.endTime : DEFAULT_END_TIME)
  const [activityChoice, setActivityChoice] = useState('')
  const [activityOther, setActivityOther] = useState('')
  const [notes, setNotes] = useState('')
  const [phoneInput, setPhoneInput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Until the renter types, the field shows the phone saved on their profile.
  const phone = phoneInput ?? user?.phone ?? ''
  const activity = activityChoice === OTHER_ACTIVITY ? activityOther.trim() : activityChoice
  const hours = toHour(endTime) - toHour(startTime)
  const estimatedTotal = hours > 0 ? venue.hourly_rate * hours : 0

  const openWindows = getOpenWindows(date, operatingHours)
  const startOptions = openWindows.flatMap((window) =>
    Array.from({ length: window.close - window.open }, (_, index) => window.open + index)
  )
  const startWindow = openWindows.find(
    (window) => toHour(startTime) >= window.open && toHour(startTime) < window.close
  )
  const endOptions = startWindow
    ? Array.from({ length: startWindow.close - toHour(startTime) }, (_, index) => toHour(startTime) + index + 1)
    : []

  const resumeState = (): RequestToBookResumeState => ({
    type: 'request-to-book',
    venueId: venue.id,
    date,
    startTime,
    endTime,
    activity,
    notes: notes.trim(),
    phone: phone.trim(),
  })

  const handleResumeRequest = useCallback((state: RequestToBookResumeState) => {
    setDate(state.date)
    setStartTime(state.startTime)
    setEndTime(state.endTime)
    if ((REQUEST_ACTIVITY_OPTIONS as readonly string[]).includes(state.activity)) {
      setActivityChoice(state.activity)
    } else if (state.activity) {
      setActivityChoice(OTHER_ACTIVITY)
      setActivityOther(state.activity)
    }
    setNotes(state.notes)
    if (state.phone) setPhoneInput(state.phone)
    setError(null)
    onResumed?.()
  }, [onResumed, setDate, setStartTime, setEndTime, setActivityChoice, setActivityOther, setNotes, setPhoneInput, setError])

  useRequestToBookAuthResume({
    venueId: venue.id,
    onResume: handleResumeRequest,
  })

  const changeStartTime = (value: string) => {
    setStartTime(value)
    if (toHour(endTime) <= toHour(value)) {
      setEndTime(hourToTime(toHour(value) + 1))
    }
  }

  const applyHint = (hint: OperatingHourWindow) => {
    // Start from tomorrow at the earliest, so a hint never lands on a time that has already passed today.
    const tomorrow = addDaysToDateString(today, 1)
    const searchFrom = minimumRequestDate > tomorrow ? minimumRequestDate : tomorrow
    setDate(nextDateForWeekday(searchFrom, hint.day_of_week))
    setStartTime(hint.start_time.slice(0, 5))
    setEndTime(hint.end_time.slice(0, 5))
    setError(null)
    posthog.capture('request_hint_tapped', { venue_id: venue.id, day_of_week: hint.day_of_week })
  }

  const getTimeError = (): string | null => {
    if (!date) return 'Choose a date'
    if (!startOptions.includes(toHour(startTime))) return 'Choose a start time when the venue is open'
    if (!endOptions.includes(toHour(endTime))) return `Pick an end time after ${formatTime(startTime)}`
    return null
  }

  /** Checks the date and times only, for the venue page card's "Request a time" step. */
  const checkTime = (): boolean => {
    const timeError = getTimeError()
    setError(timeError)
    return !timeError
  }

  const submit = async (): Promise<boolean> => {
    const validationError = getTimeError()
      || (!activity ? (activityChoice === OTHER_ACTIVITY ? 'Describe what you are planning' : 'Choose what you are planning') : null)
    if (validationError) {
      setError(validationError)
      return false
    }
    setError(null)

    if (!user) {
      openAuthModal({
        entryMode: 'login',
        contextMessage: 'Sign in to send your request',
        resumeState: resumeState(),
      })
      return false
    }

    if (!phone.trim()) {
      setError('Add a phone number so the venue can reach you')
      return false
    }

    const result = await createBooking.createBooking({
      venue_id: venue.id,
      date,
      start_time: toApiTime(startTime),
      end_time: toApiTime(endTime),
      recurring_type: 'none',
      activity,
      phone: phone.trim(),
      notes: notes.trim() || undefined,
    })

    if (result.error) {
      if (isAuthenticationError(result.error)) {
        openAuthModal({
          entryMode: 'login',
          contextMessage: 'Sign in to send your request',
          resumeState: resumeState(),
        })
        return false
      }
      setError(result.error)
      return false
    }

    if (!result.data) return false

    posthog.capture('booking_request_submitted', {
      venue_id: venue.id,
      activity,
      duration_hours: hours,
      estimated_total: estimatedTotal,
    })
    setSubmitted(true)
    return true
  }

  return {
    user,
    submitted,
    sending: createBooking.loading,
    minimumRequestDate,
    hintWindows,
    date,
    setDate,
    startTime,
    changeStartTime,
    endTime,
    setEndTime,
    startOptions,
    endOptions,
    activityChoice,
    setActivityChoice,
    activityOther,
    setActivityOther,
    activity,
    notes,
    setNotes,
    phone,
    setPhoneInput,
    hours,
    estimatedTotal,
    error,
    applyHint,
    checkTime,
    submit,
  }
}

export type RequestToBookForm = ReturnType<typeof useRequestToBookForm>
