'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { patchAdminVenueConfig, useAdminVenues } from '@/hooks/useAdminVenues'
import type { AdminVenueConfigItem } from '@/hooks/useAdminVenues'
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
  insurance_requires_manual_approval: boolean
  insurance_document_types: string
  min_advance_booking_days: string
  min_advance_lead_time_hours: string
  blackout_dates: string
  holiday_dates: string
  amenities: string[]
  policy_cancel: string
  policy_refund: string
  policy_no_show: string
  policy_operating_hours_notes: string
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
    insurance_requires_manual_approval: item.config.insurance_requires_manual_approval,
    insurance_document_types: item.config.insurance_document_types.join(', '),
    min_advance_booking_days: String(item.config.min_advance_booking_days),
    min_advance_lead_time_hours: String(item.config.min_advance_lead_time_hours),
    blackout_dates: item.config.blackout_dates.join(', '),
    holiday_dates: item.config.holiday_dates.join(', '),
    amenities: [...item.venue.amenities],
    policy_cancel: item.config.policy_cancel ?? '',
    policy_refund: item.config.policy_refund ?? '',
    policy_no_show: item.config.policy_no_show ?? '',
    policy_operating_hours_notes: item.config.policy_operating_hours_notes ?? '',
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

  if (draft.insurance_requires_manual_approval !== item.config.insurance_requires_manual_approval) {
    patch.insurance_requires_manual_approval = draft.insurance_requires_manual_approval
  }

  const documentTypes = parseCommaList(draft.insurance_document_types)
  if (!arraysEqual(documentTypes, item.config.insurance_document_types)) {
    patch.insurance_document_types = documentTypes
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

export function SuperAdminVenueConfigPage() {
  const { data, loading, error, refetch } = useAdminVenues()
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [draft, setDraft] = useState<VenueConfigDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

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

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !baselineDraft) {
      return false
    }

    return JSON.stringify(draft) !== JSON.stringify(baselineDraft)
  }, [draft, baselineDraft])

  useEffect(() => {
    if (!selectedItem) {
      setDraft(null)
      return
    }

    setDraft(createDraft(selectedItem))
    setSaveError(null)
    setSaveMessage(null)
  }, [selectedItem])

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

    try {
      await patchAdminVenueConfig(selectedItem.venue.id, patch)
      await refetch()
      setSaveMessage('Changes saved')
    } catch (savePatchError) {
      setSaveError(savePatchError instanceof Error ? savePatchError.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-secondary-50">Super Admin Venue Config</h1>
        <p className="max-w-3xl text-sm text-secondary-50/70">
          Maintain venue booking behavior and operations. Changes are saved only when you click Save Changes.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {hasUnsavedChanges ? <span className="text-amber-300">Unsaved changes</span> : <span className="text-secondary-50/60">All changes saved</span>}
          {isSaving ? <span className="text-primary-400">Saving...</span> : null}
          {saveMessage ? <span className="text-primary-400">{saveMessage}</span> : null}
          {saveError ? <span className="text-red-300">{saveError}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            Save Changes
          </Button>
        </div>
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
          <section className="rounded-2xl border border-secondary-50/10 bg-secondary-900 px-4 py-2 shadow-soft md:px-6">
            <div className="border-b border-secondary-50/10 py-4">
              <h2 className="text-xl font-semibold text-secondary-50">{selectedItem.venue.name}</h2>
              <p className="mt-1 text-xs text-secondary-50/60">
                Completeness {selectedItem.completeness.score}%.
                {' '}
                {selectedItem.completeness.missing_fields.length > 0
                  ? `Missing: ${selectedItem.completeness.missing_fields.join(', ')}`
                  : 'All required configuration complete.'}
              </p>
            </div>

            <ConfigRow
              title="Normal Booking Price"
              description="Flat rate for standard private booking sessions at this venue."
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
              <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                <input
                  type="checkbox"
                  checked={draft.instant_booking}
                  onChange={(event) => {
                    updateDraft((previous) => ({
                      ...previous,
                      instant_booking: event.target.checked,
                    }))
                  }}
                />
                Instant booking
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                <input
                  type="checkbox"
                  checked={draft.insurance_required}
                  onChange={(event) => {
                    updateDraft((previous) => ({
                      ...previous,
                      insurance_required: event.target.checked,
                    }))
                  }}
                />
                Insurance required
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                <input
                  type="checkbox"
                  checked={draft.insurance_requires_manual_approval}
                  onChange={(event) => {
                    updateDraft((previous) => ({
                      ...previous,
                      insurance_requires_manual_approval: event.target.checked,
                    }))
                  }}
                />
                Manual insurance approval required
              </label>
              <Input
                value={draft.insurance_document_types}
                placeholder="Insurance document types (comma-separated)"
                onChange={(event) => {
                  updateDraft((previous) => ({
                    ...previous,
                    insurance_document_types: event.target.value,
                  }))
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Advance Booking Rules"
              description="Same-day cutoff has been removed. Bookability now uses minimum advance days + lead time (PT)."
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

            <ConfigRow
              title="Policies"
              description="Venue-specific cancellation, refund, no-show, and operating-hours guidance."
            >
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                value={draft.policy_cancel}
                placeholder="Cancellation policy"
                onChange={(event) => {
                  updateDraft((previous) => ({ ...previous, policy_cancel: event.target.value }))
                }}
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                value={draft.policy_refund}
                placeholder="Refund policy"
                onChange={(event) => {
                  updateDraft((previous) => ({ ...previous, policy_refund: event.target.value }))
                }}
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                value={draft.policy_no_show}
                placeholder="No-show policy"
                onChange={(event) => {
                  updateDraft((previous) => ({ ...previous, policy_no_show: event.target.value }))
                }}
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                value={draft.policy_operating_hours_notes}
                placeholder="Operating hours notes"
                onChange={(event) => {
                  updateDraft((previous) => ({
                    ...previous,
                    policy_operating_hours_notes: event.target.value,
                  }))
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Blackout Dates + Holidays"
              description="Any listed date blocks booking and availability for this venue."
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
            </ConfigRow>

            <ConfigRow
              title="Drop-In Open Gym"
              description="Enable open gym sessions and set the per-person drop-in price."
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
                placeholder="Drop-in price"
                onChange={(event) => {
                  updateDraft((previous) => ({ ...previous, drop_in_price: event.target.value }))
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Drop-In Weekly Schedule"
              description="Recurring weekly windows used to generate open-gym sessions."
            >
              <div className="space-y-2">
                {draft.drop_in_templates.map((window, index) => (
                  <div
                    key={`${window.day_of_week}-${window.start_time}-${window.end_time}-${index}`}
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
                Add Window
              </Button>
            </ConfigRow>

            <ConfigRow
              title="Last Saved"
              description="Most recent saved timestamp from venue or admin configuration updates."
            >
              <div className="rounded-md border border-secondary-50/10 bg-secondary-800 px-3 py-2 text-xs text-secondary-50/70">
                {formatLastSavedAt(selectedItem)}
              </div>
            </ConfigRow>
          </section>
        )}
      </div>
    </div>
  )
}
