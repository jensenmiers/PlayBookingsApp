'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { patchAdminVenueConfig, useAdminVenues } from '@/hooks/useAdminVenues'
import type { AdminVenueConfigItem } from '@/hooks/useAdminVenues'
import { cn } from '@/lib/utils'

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

type VenueConfigDraft = {
  hourly_rate: string
  drop_in_enabled: boolean
  drop_in_price: string
  instant_booking: boolean
  insurance_required: boolean
  insurance_requires_manual_approval: boolean
  insurance_document_types: string
  min_advance_lead_time_hours: string
  same_day_cutoff_time: string
  max_advance_booking_days: string
  blackout_dates: string
  holiday_dates: string
  amenities: string[]
  policy_cancel: string
  policy_refund: string
  policy_no_show: string
  policy_operating_hours_notes: string
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
    min_advance_lead_time_hours: String(item.config.min_advance_lead_time_hours),
    same_day_cutoff_time: formatTimeForInput(item.config.same_day_cutoff_time),
    max_advance_booking_days: String(item.venue.max_advance_booking_days),
    blackout_dates: item.config.blackout_dates.join(', '),
    holiday_dates: item.config.holiday_dates.join(', '),
    amenities: [...item.venue.amenities],
    policy_cancel: item.config.policy_cancel ?? '',
    policy_refund: item.config.policy_refund ?? '',
    policy_no_show: item.config.policy_no_show ?? '',
    policy_operating_hours_notes: item.config.policy_operating_hours_notes ?? '',
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

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null
  }
  return parsed
}

function toSorted(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
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

  const minLeadHours = parseNonNegativeInteger(draft.min_advance_lead_time_hours)
  if (minLeadHours === null) {
    return { patch: {}, error: 'Minimum advance lead time must be 0 or greater.' }
  }
  if (minLeadHours !== item.config.min_advance_lead_time_hours) {
    patch.min_advance_lead_time_hours = minLeadHours
  }

  const sameDayCutoff = draft.same_day_cutoff_time.trim() || null
  if (sameDayCutoff !== formatTimeForInput(item.config.same_day_cutoff_time)) {
    patch.same_day_cutoff_time = sameDayCutoff
  }

  const maxAdvanceDays = parsePositiveInteger(draft.max_advance_booking_days)
  if (maxAdvanceDays === null) {
    return { patch: {}, error: 'Maximum advance booking days must be at least 1.' }
  }
  if (maxAdvanceDays !== item.venue.max_advance_booking_days) {
    patch.max_advance_booking_days = maxAdvanceDays
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
              title="Lead Time + Same-Day Cutoff"
              description="Minimum advance hours and local same-day booking cutoff time."
            >
              <Input
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
              <Input
                type="time"
                value={draft.same_day_cutoff_time}
                onChange={(event) => {
                  updateDraft((previous) => ({
                    ...previous,
                    same_day_cutoff_time: event.target.value,
                  }))
                }}
              />
              <Input
                type="number"
                min="1"
                step="1"
                value={draft.max_advance_booking_days}
                onChange={(event) => {
                  updateDraft((previous) => ({
                    ...previous,
                    max_advance_booking_days: event.target.value,
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
