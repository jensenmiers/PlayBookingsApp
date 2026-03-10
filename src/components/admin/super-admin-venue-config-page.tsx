'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  connectVenueCalendar,
  disconnectVenueCalendar,
  getVenueCalendarStatus,
  patchAdminVenueConfig,
  selectVenueCalendar,
  syncVenueCalendarNow,
  useAdminVenues,
} from '@/hooks/useAdminVenues'
import { useAdminVenueBookings } from '@/hooks/useAdminVenueBookings'
import type { AdminVenueConfigItem } from '@/hooks/useAdminVenues'
import type { AdminVenueBookingFeedItem, AdminVenueBookingRenterSummary } from '@/types/api'
import { formatTime, timeStringToDate } from '@/utils/dateHelpers'
import { cn } from '@/lib/utils'

const DAY_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
]

const AMENITY_OPTIONS = [
  'Parking',
  'Equipment Provided',
  'Locker Rooms',
  'Showers',
  'Bleachers',
  'Scoreboard',
  'WiFi',
  'ADA Accessible',
]

const LEAD_TIME_PRESET_HOURS = [0, 1, 2, 4, 12, 24]
const PLATFORM_TIME_ZONE = 'America/Los_Angeles'

type DropInTemplateDraftWindow = {
  day_of_week: number
  start_time: string
  end_time: string
}

type VenueConfigDraft = {
  hourly_rate: string
  drop_in_enabled: boolean
  drop_in_price: string
  instant_booking: boolean
  insurance_required: boolean
  min_advance_booking_days: string
  min_advance_lead_time_hours: string
  blackout_dates: string
  holiday_dates: string
  amenities: string[]
  policy_cancel: string
  policy_refund: string
  policy_no_show: string
  policy_operating_hours_notes: string
  operating_hours: DropInTemplateDraftWindow[]
  regular_booking_templates: DropInTemplateDraftWindow[]
  drop_in_templates: DropInTemplateDraftWindow[]
}

type TimePillOption = {
  value: string
  label: string
}

function formatTimeForInput(time: string | null | undefined): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function parseDateList(value: string): string[] {
  return parseCommaList(value).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
}

function normalizeTimeForPatch(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

function formatTimePillLabel(value: string): string {
  const normalized = normalizeTimeForPatch(value)
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(normalized)
  if (!match) {
    return value
  }

  const hour = Number(match[1])
  const minute = match[2]
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12

  if (minute === '00') {
    return `${normalizedHour} ${suffix}`
  }

  return `${normalizedHour}:${minute} ${suffix}`
}

const HOUR_TIME_OPTIONS: TimePillOption[] = Array.from({ length: 24 }, (_, hour) => {
  const hh = String(hour).padStart(2, '0')
  const value = `${hh}:00`
  return {
    value,
    label: formatTimePillLabel(value),
  }
})

function getTimeOptionSortKey(value: string): number {
  const normalized = normalizeTimeForPatch(value)
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(normalized)
  if (!match) {
    return Number.POSITIVE_INFINITY
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour * 60 + minute
}

function getTimePillOptions(currentValue: string): TimePillOption[] {
  if (!currentValue) {
    return HOUR_TIME_OPTIONS
  }

  const normalizedCurrent = formatTimeForInput(normalizeTimeForPatch(currentValue))
  const hasCurrent = HOUR_TIME_OPTIONS.some((option) => option.value === normalizedCurrent)
  if (hasCurrent) {
    return HOUR_TIME_OPTIONS
  }

  const legacyOption = {
    value: normalizedCurrent,
    label: formatTimePillLabel(normalizedCurrent),
  }

  return [...HOUR_TIME_OPTIONS, legacyOption].sort((left, right) => {
    const leftSort = getTimeOptionSortKey(left.value)
    const rightSort = getTimeOptionSortKey(right.value)
    if (leftSort !== rightSort) {
      return leftSort - rightSort
    }
    return left.value.localeCompare(right.value)
  })
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function createDraft(item: AdminVenueConfigItem): VenueConfigDraft {
  return {
    hourly_rate: String(item.venue.hourly_rate),
    drop_in_enabled: item.config.drop_in_enabled,
    drop_in_price: item.config.drop_in_price === null ? '' : String(item.config.drop_in_price),
    instant_booking: item.venue.instant_booking,
    insurance_required: item.venue.insurance_required,
    min_advance_booking_days: String(item.config.min_advance_booking_days),
    min_advance_lead_time_hours: String(item.config.min_advance_lead_time_hours),
    blackout_dates: item.config.blackout_dates.join(', '),
    holiday_dates: item.config.holiday_dates.join(', '),
    amenities: [...item.venue.amenities],
    policy_cancel: item.config.policy_cancel ?? '',
    policy_refund: item.config.policy_refund ?? '',
    policy_no_show: item.config.policy_no_show ?? '',
    policy_operating_hours_notes: item.config.policy_operating_hours_notes ?? '',
    operating_hours: (item.config.operating_hours || []).map((window) => ({
      day_of_week: window.day_of_week,
      start_time: formatTimeForInput(window.start_time),
      end_time: formatTimeForInput(window.end_time),
    })),
    regular_booking_templates: (item.regular_booking_templates || []).map((window) => ({
      day_of_week: window.day_of_week,
      start_time: formatTimeForInput(window.start_time),
      end_time: formatTimeForInput(window.end_time),
    })),
    drop_in_templates: item.drop_in_templates.map((window) => ({
      day_of_week: window.day_of_week,
      start_time: formatTimeForInput(window.start_time),
      end_time: formatTimeForInput(window.end_time),
    })),
  }
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

function parseNonNegativeInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

function toSorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function resolveLeadTimePreset(rawValue: string): string {
  const parsed = parseNonNegativeInteger(rawValue)
  if (parsed !== null && LEAD_TIME_PRESET_HOURS.includes(parsed)) {
    return String(parsed)
  }
  return 'custom'
}

function formatLeadTimeLabel(hours: number): string {
  if (hours === 0) return 'No lead time'
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

function formatPolicyPreview(minDays: number, minLeadHours: number): string {
  const now = new Date()
  const earliest = new Date(now)
  earliest.setDate(earliest.getDate() + minDays)
  earliest.setHours(earliest.getHours() + minLeadHours)

  const label = earliest.toLocaleString('en-US', {
    timeZone: PLATFORM_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `If someone books now, the earliest allowed start is ${label} PT.`
}

function normalizeDraftTemplates(value: DropInTemplateDraftWindow[]): DropInTemplateDraftWindow[] {
  const normalized = value.map((window) => ({
    day_of_week: Number(window.day_of_week),
    start_time: normalizeTimeForPatch(window.start_time),
    end_time: normalizeTimeForPatch(window.end_time),
  }))

  const unique = new Map<string, DropInTemplateDraftWindow>()
  for (const window of normalized) {
    const key = `${window.day_of_week}-${window.start_time}-${window.end_time}`
    unique.set(key, window)
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.day_of_week !== right.day_of_week) {
      return left.day_of_week - right.day_of_week
    }
    if (left.start_time !== right.start_time) {
      return left.start_time.localeCompare(right.start_time)
    }
    return left.end_time.localeCompare(right.end_time)
  })
}

function buildPatchFromDraft(
  item: AdminVenueConfigItem,
  draft: VenueConfigDraft
): { patch: Record<string, unknown>; error: string | null } {
  const patch: Record<string, unknown> = {}

  const hourlyRate = parsePositiveNumber(draft.hourly_rate)
  if (hourlyRate === null) {
    return { patch: {}, error: 'Normal booking price must be greater than 0.' }
  }
  if (hourlyRate !== item.venue.hourly_rate) {
    patch.hourly_rate = hourlyRate
  }

  if (draft.drop_in_enabled !== item.config.drop_in_enabled) {
    patch.drop_in_enabled = draft.drop_in_enabled
  }

  const dropInRaw = draft.drop_in_price.trim()
  const dropInPrice = dropInRaw.length === 0 ? null : parsePositiveNumber(dropInRaw)
  if (dropInRaw.length > 0 && dropInPrice === null) {
    return { patch: {}, error: 'Drop-in price must be greater than 0 when provided.' }
  }
  if (dropInPrice !== item.config.drop_in_price) {
    patch.drop_in_price = dropInPrice
  }

  for (const window of draft.operating_hours) {
    if (!window.start_time || !window.end_time) {
      return { patch: {}, error: 'Each operating hours window requires start and end times.' }
    }
    if (window.start_time >= window.end_time) {
      return { patch: {}, error: 'Each operating hours window must end after it starts.' }
    }
  }

  const normalizedDraftOperatingHours = normalizeDraftTemplates(draft.operating_hours)
  const normalizedCurrentOperatingHours = normalizeDraftTemplates(
    item.config.operating_hours.map((window) => ({
      day_of_week: window.day_of_week,
      start_time: window.start_time,
      end_time: window.end_time,
    }))
  )
  const operatingHoursChanged =
    JSON.stringify(normalizedDraftOperatingHours) !== JSON.stringify(normalizedCurrentOperatingHours)
  if (operatingHoursChanged) {
    patch.operating_hours = normalizedDraftOperatingHours
  }

  for (const window of draft.drop_in_templates) {
    if (!window.start_time || !window.end_time) {
      return { patch: {}, error: 'Each drop-in template window requires start and end times.' }
    }
    if (window.start_time >= window.end_time) {
      return { patch: {}, error: 'Each drop-in template window must end after it starts.' }
    }
  }

  const normalizedDraftTemplates = normalizeDraftTemplates(draft.drop_in_templates)
  const normalizedCurrentTemplates = normalizeDraftTemplates(
    item.drop_in_templates.map((window) => ({
      day_of_week: window.day_of_week,
      start_time: window.start_time,
      end_time: window.end_time,
    }))
  )
  const templatesChanged = JSON.stringify(normalizedDraftTemplates) !== JSON.stringify(normalizedCurrentTemplates)
  if (templatesChanged) {
    patch.drop_in_templates = normalizedDraftTemplates
  }

  if (draft.drop_in_enabled && normalizedDraftTemplates.length === 0) {
    return { patch: {}, error: 'Drop-in templates are required when drop-in is enabled.' }
  }

  if (draft.instant_booking !== item.venue.instant_booking) {
    patch.instant_booking = draft.instant_booking
  }

  if (draft.insurance_required !== item.venue.insurance_required) {
    patch.insurance_required = draft.insurance_required
  }

  const minAdvanceDays = parseNonNegativeInteger(draft.min_advance_booking_days)
  if (minAdvanceDays === null) {
    return { patch: {}, error: 'Minimum advance booking days must be 0 or greater.' }
  }
  if (minAdvanceDays !== item.config.min_advance_booking_days) {
    patch.min_advance_booking_days = minAdvanceDays
  }

  const minLeadHours = parseNonNegativeInteger(draft.min_advance_lead_time_hours)
  if (minLeadHours === null) {
    return { patch: {}, error: 'Minimum advance lead time must be 0 or greater.' }
  }
  if (minLeadHours !== item.config.min_advance_lead_time_hours) {
    patch.min_advance_lead_time_hours = minLeadHours
  }

  const blackoutDates = parseDateList(draft.blackout_dates)
  if (!arraysEqual(blackoutDates, item.config.blackout_dates)) {
    patch.blackout_dates = blackoutDates
  }

  const holidayDates = parseDateList(draft.holiday_dates)
  if (!arraysEqual(holidayDates, item.config.holiday_dates)) {
    patch.holiday_dates = holidayDates
  }

  const draftAmenities = toSorted(draft.amenities)
  const currentAmenities = toSorted(item.venue.amenities)
  if (!arraysEqual(draftAmenities, currentAmenities)) {
    patch.amenities = draftAmenities
  }

  const policyCancel = normalizeNullableText(draft.policy_cancel)
  if (policyCancel !== item.config.policy_cancel) {
    patch.policy_cancel = policyCancel
  }

  const policyRefund = normalizeNullableText(draft.policy_refund)
  if (policyRefund !== item.config.policy_refund) {
    patch.policy_refund = policyRefund
  }

  const policyNoShow = normalizeNullableText(draft.policy_no_show)
  if (policyNoShow !== item.config.policy_no_show) {
    patch.policy_no_show = policyNoShow
  }

  const policyOperatingHoursNotes = normalizeNullableText(draft.policy_operating_hours_notes)
  if (policyOperatingHoursNotes !== item.config.policy_operating_hours_notes) {
    patch.policy_operating_hours_notes = policyOperatingHoursNotes
  }

  return { patch, error: null }
}

function formatLastSavedAt(item: AdminVenueConfigItem): string {
  const timestamps = [item.venue.updated_at, item.config.updated_at]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))

  if (timestamps.length === 0) {
    return 'Never'
  }

  const latest = new Date(Math.max(...timestamps.map((value) => value.getTime())))
  return latest.toLocaleString()
}

const AVAILABILITY_AFFECTING_PATCH_FIELDS = [
  'drop_in_enabled',
  'drop_in_price',
  'operating_hours',
  'drop_in_templates',
  'instant_booking',
  'insurance_required',
  'min_advance_booking_days',
  'min_advance_lead_time_hours',
  'blackout_dates',
  'holiday_dates',
] as const

function isAvailabilityAffectingPatch(patch: Record<string, unknown>): boolean {
  return AVAILABILITY_AFFECTING_PATCH_FIELDS.some((field) => patch[field] !== undefined)
}

function getPersistentAvailabilityError(item: AdminVenueConfigItem | null): string | null {
  if (item?.availability_publish?.status !== 'needs_attention') {
    return null
  }
  return item.availability_publish.last_error || 'Renter availability may not fully reflect the latest saved changes.'
}

function getBookingStartMs(booking: AdminVenueBookingFeedItem): number {
  return timeStringToDate(booking.date, booking.start_time).getTime()
}

function splitBookingsByTime(bookings: AdminVenueBookingFeedItem[]): {
  upcoming: AdminVenueBookingFeedItem[]
  past: AdminVenueBookingFeedItem[]
} {
  const now = Date.now()
  const upcoming: AdminVenueBookingFeedItem[] = []
  const past: AdminVenueBookingFeedItem[] = []

  for (const booking of bookings) {
    if (getBookingStartMs(booking) < now) {
      past.push(booking)
    } else {
      upcoming.push(booking)
    }
  }

  upcoming.sort((left, right) => getBookingStartMs(left) - getBookingStartMs(right))
  past.sort((left, right) => getBookingStartMs(right) - getBookingStartMs(left))

  return { upcoming, past }
}

function formatBookingTimelineDate(booking: AdminVenueBookingFeedItem): string {
  const startDateTime = timeStringToDate(booking.date, booking.start_time)
  const dateLabel = startDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${dateLabel} · ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`
}

function formatRenterLabel(renter: AdminVenueBookingRenterSummary | null): string {
  if (!renter) {
    return 'Unknown renter'
  }

  const fullName = [renter.first_name, renter.last_name]
    .map((value) => value?.trim() || '')
    .filter((value) => value.length > 0)
    .join(' ')

  if (fullName.length > 0) {
    return fullName
  }

  if (renter.email && renter.email.length > 0) {
    return renter.email
  }

  return 'Unknown renter'
}

function resolveTimelineBadge(
  booking: AdminVenueBookingFeedItem,
  instantBooking: boolean,
  isPast: boolean
): { label: string; className: string } {
  if (booking.status === 'cancelled') {
    return {
      label: 'Cancelled',
      className: 'border-red-200 bg-red-100 text-red-800',
    }
  }

  if (booking.status === 'completed') {
    return {
      label: 'Completed',
      className: 'border-blue-200 bg-blue-100 text-blue-800',
    }
  }

  if (booking.status === 'confirmed') {
    return {
      label: 'Confirmed',
      className: 'border-green-200 bg-green-100 text-green-800',
    }
  }

  if (isPast) {
    return {
      label: 'Expired',
      className: 'border-secondary-50/20 bg-secondary-50/10 text-secondary-50/80',
    }
  }

  if (booking.insurance_required && !booking.insurance_approved) {
    return {
      label: 'Pending Insurance',
      className: 'border-accent-300/50 bg-accent-400/15 text-accent-200',
    }
  }

  if (instantBooking) {
    return {
      label: 'Pending Payment',
      className: 'border-yellow-200 bg-yellow-100 text-yellow-800',
    }
  }

  return {
    label: 'Pending Approval',
    className: 'border-yellow-200 bg-yellow-100 text-yellow-800',
  }
}

function getBookingModeHelperText(draft: VenueConfigDraft): string {
  if (draft.insurance_required) {
    return 'New bookings will start as Pending Insurance until a super-admin approves insurance.'
  }

  if (draft.instant_booking) {
    return 'New bookings will start as Pending Payment and can be paid immediately.'
  }

  return 'New bookings will start as Pending Approval until the venue owner confirms.'
}

function mapCalendarErrorCodeToMessage(code: string): string {
  if (code === 'oauth_denied') {
    return 'Google Calendar access was denied. Please approve access and try again.'
  }
  if (code === 'invalid_state') {
    return 'Google Calendar connection expired. Please connect again.'
  }
  if (code === 'missing_code_state') {
    return 'Google Calendar callback was incomplete. Please reconnect and try again.'
  }
  if (code === 'oauth_exchange_failed') {
    return 'Google Calendar sign-in succeeded, but token exchange failed. Please try again.'
  }
  if (code === 'calendar_api_disabled') {
    return 'Google Calendar API is not enabled for the configured Google project. Enable it and try again.'
  }
  return 'Google Calendar connection failed. Please try again.'
}

function TimePillSelect({
  value,
  options,
  ariaLabel,
  onChange,
}: {
  value: string
  options: TimePillOption[]
  ariaLabel: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        className="h-11 w-full appearance-none rounded-full border border-secondary-50/15 bg-secondary-800 px-8 py-2 text-center text-sm font-medium leading-none tabular-nums text-secondary-50 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-secondary-50/30 focus-visible:border-primary-400 focus-visible:ring-[3px] focus-visible:ring-primary-400/30"
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-50/55"
      >
        ▼
      </span>
    </div>
  )
}

function ConfigRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-3 border-b border-secondary-50/10 py-4 md:grid-cols-[1.25fr_1fr] md:items-start md:gap-6">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-secondary-50">{title}</h3>
        <p className="text-xs text-secondary-50/60">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SectionGroup({
  title,
  description,
  children,
  footerAction,
  footerHelper,
}: {
  title: string
  description?: string
  children: ReactNode
  footerAction?: ReactNode
  footerHelper?: string
}) {
  return (
    <section className="rounded-2xl border border-secondary-50/10 bg-secondary-900 shadow-soft">
      <div className="border-b border-secondary-50/10 px-4 py-4 md:px-6">
        <h2 className="text-lg font-semibold text-secondary-50">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-secondary-50/60">{description}</p>
        ) : null}
      </div>
      <div className="px-4 md:px-6">{children}</div>
      {footerAction ? (
        <div className="border-t border-secondary-50/10 px-4 py-4 md:px-6">
          {footerHelper ? (
            <p className="mb-3 text-xs text-secondary-50/60">{footerHelper}</p>
          ) : null}
          {footerAction}
        </div>
      ) : null}
    </section>
  )
}

function CollapsibleRow({
  title,
  description,
  children,
  defaultExpanded = false,
}: {
  title: string
  description: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-secondary-50/10 py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-secondary-50">{title}</h3>
          <p className="text-xs text-secondary-50/60">{description}</p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            'text-sm text-secondary-50/60 transition-transform',
            isExpanded ? 'rotate-180' : ''
          )}
        >
          ▼
        </span>
      </button>
      {isExpanded ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[1.25fr_1fr] md:items-start md:gap-6">
          <div />
          <div className="space-y-2">{children}</div>
        </div>
      ) : null}
    </div>
  )
}

export function SuperAdminVenueConfigPage() {
  const { data, loading, error, refetch } = useAdminVenues()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const {
    data: venueBookings,
    loading: venueBookingsLoading,
    error: venueBookingsError,
    refetch: refetchVenueBookings,
    approveInsurance,
  } = useAdminVenueBookings(selectedVenueId)
  const [draft, setDraft] = useState<VenueConfigDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveInFlightLabel, setSaveInFlightLabel] = useState<string>('Saving...')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [insuranceActionBookingId, setInsuranceActionBookingId] = useState<string | null>(null)
  const [insuranceActionError, setInsuranceActionError] = useState<string | null>(null)
  const [insuranceActionMessage, setInsuranceActionMessage] = useState<string | null>(null)
  const [calendarStatusLoading, setCalendarStatusLoading] = useState(false)
  const [calendarActionLoading, setCalendarActionLoading] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null)
  const [calendarOptions, setCalendarOptions] = useState<Array<{ id: string; summary: string; primary: boolean }>>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'configuration' | 'bookings'>('configuration')
  const [blackoutExpanded, setBlackoutExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const venueIdParam = url.searchParams.get('venue_id')
    const connectedParam = url.searchParams.get('calendar_connected')
    const errorCodeParam = url.searchParams.get('calendar_error_code')
    const errorParam = url.searchParams.get('calendar_error')

    if (venueIdParam) {
      setSelectedVenueId(venueIdParam)
      url.searchParams.delete('venue_id')
    }
    if (connectedParam === '1') {
      setCalendarMessage('Google Calendar connected. Choose the calendar for this venue to generate availability.')
      url.searchParams.delete('calendar_connected')
    }
    if (errorCodeParam) {
      setCalendarError(mapCalendarErrorCodeToMessage(errorCodeParam))
      url.searchParams.delete('calendar_error_code')
      url.searchParams.delete('calendar_error')
    } else if (errorParam) {
      setCalendarError('Google Calendar connection failed. Please try again.')
      url.searchParams.delete('calendar_error')
    }

    if (venueIdParam || connectedParam || errorCodeParam || errorParam) {
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  useEffect(() => {
    if (!selectedVenueId && data && data.length > 0) {
      setSelectedVenueId(data[0].venue.id)
    }
  }, [data, selectedVenueId])

  const selectedItem = useMemo(() => {
    if (!data || !selectedVenueId) return null
    return data.find((item) => item.venue.id === selectedVenueId) || null
  }, [data, selectedVenueId])

  const baselineDraft = useMemo(() => {
    if (!selectedItem) {
      return null
    }

    return createDraft(selectedItem)
  }, [selectedItem])

  const timelineBookings = useMemo(() => {
    return splitBookingsByTime(venueBookings || [])
  }, [venueBookings])

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !baselineDraft) {
      return false
    }

    return JSON.stringify(draft) !== JSON.stringify(baselineDraft)
  }, [draft, baselineDraft])

  useEffect(() => {
    if (!selectedItem) {
      setDraft(null)
      setCalendarOptions([])
      setSelectedCalendarId('')
      return
    }

    setDraft(createDraft(selectedItem))
    setSaveError(null)
    setSaveMessage(null)
    setInsuranceActionError(null)
    setInsuranceActionMessage(null)
    setInsuranceActionBookingId(null)
    setCalendarMessage(null)
    setSaveInFlightLabel('Saving...')
    setCalendarOptions([])
    setSelectedCalendarId(selectedItem.calendar_integration?.google_calendar_id || '')
  }, [selectedItem])

  useEffect(() => {
    if (!selectedVenueId) {
      setCalendarOptions([])
      return
    }

    const loadCalendarStatus = async () => {
      setCalendarStatusLoading(true)
      try {
        const status = await getVenueCalendarStatus(selectedVenueId, true)
        setCalendarOptions(status.calendars || [])
        if (status.integration?.google_calendar_id) {
          setSelectedCalendarId(status.integration.google_calendar_id)
        } else if (status.calendars.length > 0) {
          const primary = status.calendars.find((calendar) => calendar.primary) || status.calendars[0]
          setSelectedCalendarId(primary.id)
        }
      } catch (statusError) {
        setCalendarError(statusError instanceof Error ? statusError.message : 'Failed to load calendar status')
      } finally {
        setCalendarStatusLoading(false)
      }
    }

    void loadCalendarStatus()
  }, [selectedVenueId])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return
    }

    const warningMessage = 'You have unsaved changes. Leave this page and discard them?'

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target as Element | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || anchor.target === '_blank') {
        return
      }

      const destination = new URL(anchor.href, window.location.href)
      const current = new URL(window.location.href)
      const isSameLocation =
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.search === current.search &&
        destination.hash === current.hash

      if (isSameLocation) {
        return
      }

      if (!window.confirm(warningMessage)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleDocumentClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleDocumentClick, true)
    }
  }, [hasUnsavedChanges])

  const updateDraft = (updater: (previous: VenueConfigDraft) => VenueConfigDraft) => {
    setDraft((previous) => {
      if (!previous) {
        return previous
      }

      return updater(previous)
    })
  }

  const handleVenueSelect = (venueId: string) => {
    if (venueId === selectedVenueId) {
      return
    }

    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Switch venues and discard them?')
      if (!confirmed) {
        return
      }
    }

    setSelectedVenueId(venueId)
  }

  const handleDiscardChanges = () => {
    if (!selectedItem) {
      return
    }

    setDraft(createDraft(selectedItem))
    setSaveError(null)
    setSaveMessage('Unsaved changes discarded')
  }

  const handleSaveChanges = async () => {
    if (!selectedItem || !draft) {
      return
    }

    const { patch, error: patchError } = buildPatchFromDraft(selectedItem, draft)
    if (patchError) {
      setSaveError(patchError)
      setSaveMessage(null)
      return
    }

    if (Object.keys(patch).length === 0) {
      setSaveError(null)
      setSaveMessage('No changes to save')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    setSaveInFlightLabel(
      isAvailabilityAffectingPatch(patch) ? 'Updating renter availability...' : 'Saving...'
    )

    try {
      const result = await patchAdminVenueConfig(selectedItem.venue.id, patch)
      await refetch()
      setSaveMessage(result.message || 'Changes saved')
    } catch (savePatchError) {
      setSaveError(savePatchError instanceof Error ? savePatchError.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
      setSaveInFlightLabel('Saving...')
    }
  }

  const handleApproveInsurance = async (bookingId: string) => {
    setInsuranceActionBookingId(bookingId)
    setInsuranceActionError(null)
    setInsuranceActionMessage(null)

    try {
      const result = await approveInsurance(bookingId)
      if (!result.success) {
        setInsuranceActionError(result.error || 'Failed to approve insurance')
        return
      }
      await refetchVenueBookings()
      setInsuranceActionMessage('Insurance approved')
    } catch (actionError) {
      setInsuranceActionError(actionError instanceof Error ? actionError.message : 'Failed to approve insurance')
    } finally {
      setInsuranceActionBookingId(null)
    }
  }

  const handleConnectCalendar = async () => {
    if (!selectedItem) {
      return
    }

    setCalendarActionLoading(true)
    setCalendarError(null)
    setCalendarMessage(null)
    try {
      const data = await connectVenueCalendar(selectedItem.venue.id)
      window.location.assign(data.auth_url)
    } catch (connectError) {
      setCalendarError(connectError instanceof Error ? connectError.message : 'Failed to connect Google Calendar')
      setCalendarActionLoading(false)
    }
  }

  const handleRefreshCalendars = async () => {
    if (!selectedItem) {
      return
    }

    setCalendarStatusLoading(true)
    setCalendarError(null)
    setCalendarMessage(null)
    try {
      const data = await getVenueCalendarStatus(selectedItem.venue.id, true)
      setCalendarOptions(data.calendars || [])
      if (data.integration?.google_calendar_id) {
        setSelectedCalendarId(data.integration.google_calendar_id)
      }
    } catch (statusError) {
      setCalendarError(statusError instanceof Error ? statusError.message : 'Failed to refresh calendars')
    } finally {
      setCalendarStatusLoading(false)
    }
  }

  const handleSelectCalendar = async () => {
    if (!selectedItem || !selectedCalendarId) {
      setCalendarError('Select a Google calendar before saving')
      return
    }

    const selected = calendarOptions.find((calendar) => calendar.id === selectedCalendarId)
    setCalendarActionLoading(true)
    setCalendarError(null)
    setCalendarMessage(null)
    try {
      await selectVenueCalendar(selectedItem.venue.id, {
        calendar_id: selectedCalendarId,
        calendar_name: selected?.summary || null,
      })
      await refetch()
      setCalendarMessage('Google Calendar selected. This calendar will be used to generate venue availability.')
    } catch (selectError) {
      setCalendarError(selectError instanceof Error ? selectError.message : 'Failed to select Google calendar')
    } finally {
      setCalendarActionLoading(false)
    }
  }

  const handleSyncCalendarNow = async () => {
    if (!selectedItem) {
      return
    }

    setCalendarActionLoading(true)
    setCalendarError(null)
    setCalendarMessage(null)
    try {
      const result = await syncVenueCalendarNow(selectedItem.venue.id)
      await refetch()
      setCalendarMessage(
        `Calendar synced. Venue availability has been recalculated from operating hours and Google Calendar busy times. (${result.upsertedCount} updates, ${result.cancelledCount} cancellations)`
      )
    } catch (syncError) {
      setCalendarError(syncError instanceof Error ? syncError.message : 'Failed to sync Google calendar')
    } finally {
      setCalendarActionLoading(false)
    }
  }

  const handleDisconnectCalendar = async () => {
    if (!selectedItem) {
      return
    }

    const confirmed = window.confirm(
      'Disconnect Google Calendar for this venue? PlayBookings will stop using Google Calendar busy times when generating venue availability.'
    )
    if (!confirmed) {
      return
    }

    setCalendarActionLoading(true)
    setCalendarError(null)
    setCalendarMessage(null)
    try {
      await disconnectVenueCalendar(selectedItem.venue.id)
      await refetch()
      setCalendarMessage('Google Calendar disconnected. PlayBookings will no longer use calendar busy times for this venue.')
    } catch (disconnectError) {
      setCalendarError(disconnectError instanceof Error ? disconnectError.message : 'Failed to disconnect Google Calendar')
    } finally {
      setCalendarActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold text-secondary-50">Super Admin Venue Config</h1>
        <p className="text-sm text-secondary-50/60">Loading venue configuration...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-bold text-secondary-50">Super Admin Venue Config</h1>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-2xl font-bold text-secondary-50">Super Admin Venue Config</h1>
        <p className="text-sm text-secondary-50/60">No venues found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl font-bold text-secondary-50">Super Admin Venue Config</h1>
        <p className="max-w-3xl text-sm text-secondary-50/70">
          Configure venue availability, pricing, policies, and amenities.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-secondary-50/10 bg-secondary-900 p-4 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-secondary-50">Venues</h2>
          <div className="space-y-2">
            {data.map((item) => (
              <button
                key={item.venue.id}
                type="button"
                className={cn(
                  'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                  selectedVenueId === item.venue.id
                    ? 'border-primary-400/60 bg-primary-400/10'
                    : 'border-secondary-50/10 bg-secondary-800 hover:bg-secondary-700'
                )}
                onClick={() => handleVenueSelect(item.venue.id)}
              >
                <p className="text-sm font-semibold text-secondary-50">{item.venue.name}</p>
                <p className="text-xs text-secondary-50/60">{item.venue.city}, {item.venue.state}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-secondary-50/70">Completeness {item.completeness.score}%</span>
                  <span className="text-[10px] text-secondary-50/60">Last saved: {formatLastSavedAt(item)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {selectedItem && draft && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-secondary-50/10 bg-secondary-900 shadow-soft">
              <div className="flex items-center justify-between border-b border-secondary-50/10 px-4 py-3 md:px-6">
                <div>
                  <h2 className="text-xl font-semibold text-secondary-50">{selectedItem.venue.name}</h2>
                  <p className="mt-0.5 text-xs text-secondary-50/60">
                    Completeness {selectedItem.completeness.score}%.
                    {' '}
                    {selectedItem.completeness.missing_fields.length > 0
                      ? `Missing: ${selectedItem.completeness.missing_fields.join(', ')}`
                      : 'All required configuration complete.'}
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-secondary-50/15 bg-secondary-800 p-1">
                  <button
                    type="button"
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                      activeTab === 'configuration'
                        ? 'bg-primary-400 text-secondary-900'
                        : 'text-secondary-50/70 hover:text-secondary-50'
                    )}
                    onClick={() => setActiveTab('configuration')}
                  >
                    Configuration
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                      activeTab === 'bookings'
                        ? 'bg-primary-400 text-secondary-900'
                        : 'text-secondary-50/70 hover:text-secondary-50'
                    )}
                    onClick={() => setActiveTab('bookings')}
                  >
                    Bookings
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'configuration' && (
              <>
                <SectionGroup
                  title="Define/Set Availability"
                  description="Configure when this venue is available for bookings."
                  footerAction={
                    <Button
                      type="button"
                      onClick={() => {
                        void handleSaveChanges()
                      }}
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      Publish Availability
                    </Button>
                  }
                  footerHelper="This publishes availability changes to renters."
                >
                  <ConfigRow
                    title="Base Operating Hours"
                    description="Weekly windows for regular booking template generation."
                  >
                    <div className="space-y-2">
                      {draft.operating_hours.map((window, index) => (
                        <div
                          key={`op-${window.day_of_week}-${window.start_time}-${window.end_time}-${index}`}
                          className="grid grid-cols-[minmax(9.5rem,1.15fr)_minmax(7.5rem,8.5rem)_minmax(7.5rem,8.5rem)_auto] items-center gap-3"
                        >
                          <select
                            aria-label={`Operating hours day row ${index + 1}`}
                            className="h-11 w-full appearance-none rounded-full border border-secondary-50/15 bg-secondary-800 px-5 py-2 text-sm font-medium text-secondary-50 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-secondary-50/30 focus-visible:border-primary-400 focus-visible:ring-[3px] focus-visible:ring-primary-400/30"
                            value={window.day_of_week}
                            onChange={(event) => {
                              updateDraft((previous) => {
                                const next = [...previous.operating_hours]
                                next[index] = { ...next[index], day_of_week: Number(event.target.value) }
                                return { ...previous, operating_hours: next }
                              })
                            }}
                          >
                            {DAY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <TimePillSelect
                            ariaLabel={`Operating hours start time row ${index + 1}`}
                            value={window.start_time}
                            options={getTimePillOptions(window.start_time)}
                            onChange={(value) => {
                              updateDraft((previous) => {
                                const next = [...previous.operating_hours]
                                next[index] = { ...next[index], start_time: value }
                                return { ...previous, operating_hours: next }
                              })
                            }}
                          />

                          <TimePillSelect
                            ariaLabel={`Operating hours end time row ${index + 1}`}
                            value={window.end_time}
                            options={getTimePillOptions(window.end_time)}
                            onChange={(value) => {
                              updateDraft((previous) => {
                                const next = [...previous.operating_hours]
                                next[index] = { ...next[index], end_time: value }
                                return { ...previous, operating_hours: next }
                              })
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 rounded-xl px-3 text-secondary-50/80 hover:text-secondary-50"
                            onClick={() => {
                              updateDraft((previous) => ({
                                ...previous,
                                operating_hours: previous.operating_hours.filter(
                                  (_, rowIndex) => rowIndex !== index
                                ),
                              }))
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        updateDraft((previous) => ({
                          ...previous,
                          operating_hours: [
                            ...previous.operating_hours,
                            { day_of_week: 1, start_time: '12:00', end_time: '13:00' },
                          ],
                        }))
                      }}
                    >
                      Add Operating Window
                    </Button>
                  </ConfigRow>

                  <ConfigRow
                    title="Google Calendar"
                    description="Connect Google Calendar to block busy times from availability."
                  >
                    <div className="space-y-2">
                      <div className="rounded-md border border-secondary-50/10 bg-secondary-800 px-3 py-2 text-xs text-secondary-50/70">
                        <p>
                          Status:{' '}
                          <span className="font-medium text-secondary-50">
                            {selectedItem.calendar_integration?.status || 'disconnected'}
                          </span>
                        </p>
                        <p>
                          Selected calendar:{' '}
                          <span className="font-medium text-secondary-50">
                            {selectedItem.calendar_integration?.google_calendar_name
                              || selectedItem.calendar_integration?.google_calendar_id
                              || 'None'}
                          </span>
                        </p>
                        <p>
                          Last sync:{' '}
                          <span className="font-medium text-secondary-50">
                            {selectedItem.calendar_integration?.last_synced_at
                              ? new Date(selectedItem.calendar_integration.last_synced_at).toLocaleString()
                              : 'Never'}
                          </span>
                        </p>
                      </div>

                      {calendarError ? <p className="text-xs text-red-300">{calendarError}</p> : null}
                      {calendarMessage ? <p className="text-xs text-primary-400">{calendarMessage}</p> : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={calendarActionLoading}
                          onClick={() => {
                            void handleConnectCalendar()
                          }}
                        >
                          {calendarActionLoading ? 'Working...' : 'Connect Google Calendar'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={calendarActionLoading || calendarStatusLoading}
                          onClick={() => {
                            void handleRefreshCalendars()
                          }}
                        >
                          {calendarStatusLoading ? 'Refreshing...' : 'Refresh Calendars'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="selected-calendar-id" className="text-xs font-medium text-secondary-50/70">
                          Selected Google calendar
                        </label>
                        <select
                          id="selected-calendar-id"
                          aria-label="Selected Google calendar"
                          className="h-11 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                          value={selectedCalendarId}
                          onChange={(event) => {
                            setSelectedCalendarId(event.target.value)
                          }}
                        >
                          <option value="">Select calendar</option>
                          {calendarOptions.map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>
                              {calendar.summary}{calendar.primary ? ' (Primary)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={calendarActionLoading || !selectedCalendarId}
                          onClick={() => {
                            void handleSelectCalendar()
                          }}
                        >
                          Save Calendar Selection
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={calendarActionLoading}
                          onClick={() => {
                            void handleSyncCalendarNow()
                          }}
                        >
                          Sync Now
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={calendarActionLoading}
                          onClick={() => {
                            void handleDisconnectCalendar()
                          }}
                        >
                          Disconnect Calendar
                        </Button>
                      </div>

                      {selectedItem.calendar_integration?.last_error ? (
                        <p className="text-xs text-red-300">Last sync error: {selectedItem.calendar_integration.last_error}</p>
                      ) : null}
                    </div>
                  </ConfigRow>

                  <ConfigRow
                    title="Drop-In Open Gym"
                    description="Enable open gym sessions with drop-in pricing and weekly schedule."
                  >
                    <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                      <input
                        type="checkbox"
                        checked={draft.drop_in_enabled}
                        onChange={(event) => {
                          updateDraft((previous) => ({
                            ...previous,
                            drop_in_enabled: event.target.checked,
                          }))
                        }}
                      />
                      Drop-in enabled
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={draft.drop_in_price}
                      placeholder="Drop-in price per person"
                      onChange={(event) => {
                        updateDraft((previous) => ({ ...previous, drop_in_price: event.target.value }))
                      }}
                    />

                    {draft.drop_in_enabled && (
                      <>
                        <p className="text-xs font-medium text-secondary-50/70 pt-2">Drop-In Weekly Schedule</p>
                        <div className="space-y-2">
                          {draft.drop_in_templates.map((window, index) => (
                            <div
                              key={`di-${window.day_of_week}-${window.start_time}-${window.end_time}-${index}`}
                              className="grid grid-cols-[minmax(9.5rem,1.15fr)_minmax(7.5rem,8.5rem)_minmax(7.5rem,8.5rem)_auto] items-center gap-3"
                            >
                              <select
                                aria-label={`Drop-in day row ${index + 1}`}
                                className="h-11 w-full appearance-none rounded-full border border-secondary-50/15 bg-secondary-800 px-5 py-2 text-sm font-medium text-secondary-50 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-secondary-50/30 focus-visible:border-primary-400 focus-visible:ring-[3px] focus-visible:ring-primary-400/30"
                                value={window.day_of_week}
                                onChange={(event) => {
                                  updateDraft((previous) => {
                                    const next = [...previous.drop_in_templates]
                                    next[index] = { ...next[index], day_of_week: Number(event.target.value) }
                                    return { ...previous, drop_in_templates: next }
                                  })
                                }}
                              >
                                {DAY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              <TimePillSelect
                                ariaLabel={`Drop-in start time row ${index + 1}`}
                                value={window.start_time}
                                options={getTimePillOptions(window.start_time)}
                                onChange={(value) => {
                                  updateDraft((previous) => {
                                    const next = [...previous.drop_in_templates]
                                    next[index] = { ...next[index], start_time: value }
                                    return { ...previous, drop_in_templates: next }
                                  })
                                }}
                              />

                              <TimePillSelect
                                ariaLabel={`Drop-in end time row ${index + 1}`}
                                value={window.end_time}
                                options={getTimePillOptions(window.end_time)}
                                onChange={(value) => {
                                  updateDraft((previous) => {
                                    const next = [...previous.drop_in_templates]
                                    next[index] = { ...next[index], end_time: value }
                                    return { ...previous, drop_in_templates: next }
                                  })
                                }}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-11 rounded-xl px-3 text-secondary-50/80 hover:text-secondary-50"
                                onClick={() => {
                                  updateDraft((previous) => ({
                                    ...previous,
                                    drop_in_templates: previous.drop_in_templates.filter((_, rowIndex) => rowIndex !== index),
                                  }))
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            updateDraft((previous) => ({
                              ...previous,
                              drop_in_templates: [
                                ...previous.drop_in_templates,
                                { day_of_week: 1, start_time: '12:00', end_time: '13:00' },
                              ],
                            }))
                          }}
                        >
                          Add Drop-In Window
                        </Button>
                      </>
                    )}
                  </ConfigRow>

                  <CollapsibleRow
                    title="Blackout Dates"
                    description="Block specific dates from availability."
                    defaultExpanded={blackoutExpanded}
                  >
                    <Input
                      value={draft.blackout_dates}
                      placeholder="Blackout dates: YYYY-MM-DD, YYYY-MM-DD"
                      onChange={(event) => {
                        updateDraft((previous) => ({
                          ...previous,
                          blackout_dates: event.target.value,
                        }))
                      }}
                    />
                    <Input
                      value={draft.holiday_dates}
                      placeholder="Holiday dates: YYYY-MM-DD, YYYY-MM-DD"
                      onChange={(event) => {
                        updateDraft((previous) => ({
                          ...previous,
                          holiday_dates: event.target.value,
                        }))
                      }}
                    />
                  </CollapsibleRow>

                  <ConfigRow
                    title="Advance Booking Rules"
                    description="Control how far in advance bookings can be made."
                  >
                    <div className="space-y-1">
                      <label htmlFor="min-advance-booking-days" className="text-xs font-medium text-secondary-50/70">
                        Minimum advance booking days
                      </label>
                      <Input
                        id="min-advance-booking-days"
                        aria-label="Minimum advance booking days"
                        type="number"
                        min="0"
                        step="1"
                        value={draft.min_advance_booking_days}
                        onChange={(event) => {
                          updateDraft((previous) => ({
                            ...previous,
                            min_advance_booking_days: event.target.value,
                          }))
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="min-advance-lead-time" className="text-xs font-medium text-secondary-50/70">
                        Minimum lead time
                      </label>
                      <select
                        id="min-advance-lead-time"
                        aria-label="Minimum advance lead time preset"
                        className="h-11 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                        value={resolveLeadTimePreset(draft.min_advance_lead_time_hours)}
                        onChange={(event) => {
                          const { value } = event.target
                          if (value === 'custom') {
                            return
                          }
                          updateDraft((previous) => ({
                            ...previous,
                            min_advance_lead_time_hours: value,
                          }))
                        }}
                      >
                        {LEAD_TIME_PRESET_HOURS.map((hours) => (
                          <option key={hours} value={String(hours)}>
                            {formatLeadTimeLabel(hours)}
                          </option>
                        ))}
                        <option value="custom">Custom (hours)</option>
                      </select>
                      {resolveLeadTimePreset(draft.min_advance_lead_time_hours) === 'custom' && (
                        <Input
                          aria-label="Custom minimum lead time hours"
                          type="number"
                          min="0"
                          step="1"
                          value={draft.min_advance_lead_time_hours}
                          onChange={(event) => {
                            updateDraft((previous) => ({
                              ...previous,
                              min_advance_lead_time_hours: event.target.value,
                            }))
                          }}
                        />
                      )}
                      <p className="text-[11px] text-secondary-50/50">
                        Lead time means how many hours before start time a booking must be made.
                      </p>
                    </div>

                    <div className="rounded-md border border-secondary-50/10 bg-secondary-800 px-3 py-2 text-xs text-secondary-50/70">
                      {(() => {
                        const minDays = parseNonNegativeInteger(draft.min_advance_booking_days)
                        const minLeadHours = parseNonNegativeInteger(draft.min_advance_lead_time_hours)
                        if (minDays === null || minLeadHours === null) {
                          return 'Enter non-negative whole numbers to preview policy behavior.'
                        }
                        return formatPolicyPreview(minDays, minLeadHours)
                      })()}
                    </div>
                  </ConfigRow>
                </SectionGroup>

                <SectionGroup title="Pricing & Booking Settings">
                  <ConfigRow
                    title="Normal Booking Price"
                    description="Flat rate for standard private booking sessions."
                  >
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={draft.hourly_rate}
                      onChange={(event) => {
                        updateDraft((previous) => ({ ...previous, hourly_rate: event.target.value }))
                      }}
                    />
                  </ConfigRow>

                  <ConfigRow
                    title="Booking Mode"
                    description="Control instant booking and insurance requirements."
                  >
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-secondary-50/70">Booking mode</p>
                        <div className="inline-flex rounded-full border border-secondary-50/15 bg-secondary-800 p-1">
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                              draft.instant_booking
                                ? 'bg-primary-400 text-secondary-900'
                                : 'text-secondary-50/70 hover:text-secondary-50'
                            )}
                            onClick={() => {
                              updateDraft((previous) => ({ ...previous, instant_booking: true }))
                            }}
                          >
                            Instant
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                              !draft.instant_booking
                                ? 'bg-primary-400 text-secondary-900'
                                : 'text-secondary-50/70 hover:text-secondary-50'
                            )}
                            onClick={() => {
                              updateDraft((previous) => ({ ...previous, instant_booking: false }))
                            }}
                          >
                            Manual approval
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-secondary-50/70">Insurance</p>
                        <div className="inline-flex rounded-full border border-secondary-50/15 bg-secondary-800 p-1">
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                              draft.insurance_required
                                ? 'bg-primary-400 text-secondary-900'
                                : 'text-secondary-50/70 hover:text-secondary-50'
                            )}
                            onClick={() => {
                              updateDraft((previous) => ({ ...previous, insurance_required: true }))
                            }}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                              !draft.insurance_required
                                ? 'bg-primary-400 text-secondary-900'
                                : 'text-secondary-50/70 hover:text-secondary-50'
                            )}
                            onClick={() => {
                              updateDraft((previous) => ({ ...previous, insurance_required: false }))
                            }}
                          >
                            Not required
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-secondary-50/60">{getBookingModeHelperText(draft)}</p>
                    </div>
                  </ConfigRow>
                </SectionGroup>

                <SectionGroup title="Policies">
                  <ConfigRow
                    title="Cancellation, Refund & No-Show"
                    description="Venue-specific policy guidance for renters."
                  >
                    <textarea
                      className="min-h-16 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                      value={draft.policy_cancel}
                      placeholder="Cancellation policy"
                      onChange={(event) => {
                        updateDraft((previous) => ({ ...previous, policy_cancel: event.target.value }))
                      }}
                    />
                    <textarea
                      className="min-h-16 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                      value={draft.policy_refund}
                      placeholder="Refund policy"
                      onChange={(event) => {
                        updateDraft((previous) => ({ ...previous, policy_refund: event.target.value }))
                      }}
                    />
                    <textarea
                      className="min-h-16 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                      value={draft.policy_no_show}
                      placeholder="No-show policy"
                      onChange={(event) => {
                        updateDraft((previous) => ({ ...previous, policy_no_show: event.target.value }))
                      }}
                    />
                  </ConfigRow>
                </SectionGroup>

                <SectionGroup title="Amenities">
                  <ConfigRow
                    title="Amenities Checklist"
                    description="Shown on venue cards/details and used for completeness checks."
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {AMENITY_OPTIONS.map((amenity) => {
                        const checked = draft.amenities.includes(amenity)
                        return (
                          <label key={amenity} className="flex items-center gap-2 text-sm text-secondary-50/80">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                updateDraft((previous) => {
                                  const nextAmenities = event.target.checked
                                    ? Array.from(new Set([...previous.amenities, amenity]))
                                    : previous.amenities.filter((item) => item !== amenity)

                                  return {
                                    ...previous,
                                    amenities: nextAmenities,
                                  }
                                })
                              }}
                            />
                            {amenity}
                          </label>
                        )
                      })}
                    </div>
                  </ConfigRow>
                </SectionGroup>
              </>
            )}

            {activeTab === 'bookings' && (
              <SectionGroup title="Venue Bookings Timeline" description="Single chronological feed of all venue bookings.">
                <div className="py-4">
                  {insuranceActionError ? (
                    <p className="text-xs text-red-300 mb-2">{insuranceActionError}</p>
                  ) : null}
                  {insuranceActionMessage ? (
                    <p className="text-xs text-primary-400 mb-2">{insuranceActionMessage}</p>
                  ) : null}
                  {venueBookingsLoading ? (
                    <p className="text-xs text-secondary-50/60">Loading bookings...</p>
                  ) : venueBookingsError ? (
                    <div className="space-y-2 rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2">
                      <p className="text-xs text-red-200">{venueBookingsError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void refetchVenueBookings()
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : !venueBookings || venueBookings.length === 0 ? (
                    <p className="text-xs text-secondary-50/60">No bookings for this venue yet.</p>
                  ) : (
                    <div data-testid="venue-bookings-timeline" className="space-y-2">
                      {timelineBookings.upcoming.map((booking) => {
                        const badge = resolveTimelineBadge(booking, selectedItem.venue.instant_booking, false)
                        const canApproveInsurance =
                          booking.status === 'pending'
                          && booking.insurance_required
                          && !booking.insurance_approved

                        return (
                          <div
                            key={booking.id}
                            data-testid="venue-booking-row"
                            data-booking-id={booking.id}
                            className="rounded-xl border border-secondary-50/10 bg-secondary-800 px-3 py-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-secondary-50">{formatRenterLabel(booking.renter)}</p>
                                <p className="text-xs text-secondary-50/70">{booking.renter?.email || 'No email on file'}</p>
                                <p className="text-xs text-secondary-50/60">{formatBookingTimelineDate(booking)}</p>
                                {canApproveInsurance ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={insuranceActionBookingId === booking.id}
                                    onClick={() => {
                                      void handleApproveInsurance(booking.id)
                                    }}
                                  >
                                    {insuranceActionBookingId === booking.id ? 'Approving...' : 'Approve Insurance'}
                                  </Button>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold text-secondary-50">${booking.total_amount.toFixed(2)}</span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                    badge.className
                                  )}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {timelineBookings.past.length > 0 ? (
                        <div className="pt-1">
                          <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-secondary-50/15" />
                            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-50/45">Past bookings</p>
                            <div className="h-px flex-1 bg-secondary-50/15" />
                          </div>
                        </div>
                      ) : null}

                      {timelineBookings.past.map((booking) => {
                        const badge = resolveTimelineBadge(booking, selectedItem.venue.instant_booking, true)

                        return (
                          <div
                            key={booking.id}
                            data-testid="venue-booking-row"
                            data-booking-id={booking.id}
                            className="rounded-xl border border-secondary-50/10 bg-secondary-800 px-3 py-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-secondary-50">{formatRenterLabel(booking.renter)}</p>
                                <p className="text-xs text-secondary-50/70">{booking.renter?.email || 'No email on file'}</p>
                                <p className="text-xs text-secondary-50/60">{formatBookingTimelineDate(booking)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold text-secondary-50">${booking.total_amount.toFixed(2)}</span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                    badge.className
                                  )}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </SectionGroup>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-secondary-50/10 bg-secondary-900/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {hasUnsavedChanges ? (
              <span className="text-amber-300">Unsaved changes</span>
            ) : (
              <span className="text-secondary-50/60">All changes saved</span>
            )}
            {selectedItem && getPersistentAvailabilityError(selectedItem) && (
              <span className="text-red-300">{getPersistentAvailabilityError(selectedItem)}</span>
            )}
            {isSaving && <span className="text-primary-400">{saveInFlightLabel}</span>}
            {saveMessage && <span className="text-primary-400">{saveMessage}</span>}
            {saveError && <span className="text-red-300">{saveError}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={!hasUnsavedChanges || isSaving}
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSaveChanges()
              }}
              disabled={!hasUnsavedChanges || isSaving}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
