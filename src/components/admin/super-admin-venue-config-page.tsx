'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminVenues, patchAdminVenueConfig } from '@/hooks/useAdminVenues'
import type { OperatingHourWindow } from '@/types'
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
  const [savingKey, setSavingKey] = useState<string | null>(null)
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

  const savePatch = async (key: string, patch: Record<string, unknown>) => {
    if (!selectedItem) return
    setSavingKey(key)
    setSaveError(null)
    setSaveMessage(null)
    try {
      await patchAdminVenueConfig(selectedItem.venue.id, patch)
      await refetch()
      setSaveMessage('Saved')
    } catch (savePatchError) {
      setSaveError(savePatchError instanceof Error ? savePatchError.message : 'Failed to save')
    } finally {
      setSavingKey(null)
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
          Maintain venue booking behavior and operations. Edits save immediately and affect venue runtime rules.
        </p>
        <div className="flex items-center gap-3 text-xs">
          {savingKey ? <span className="text-primary-400">Saving {savingKey}...</span> : null}
          {saveMessage ? <span className="text-primary-400">{saveMessage}</span> : null}
          {saveError ? <span className="text-red-300">{saveError}</span> : null}
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
                onClick={() => setSelectedVenueId(item.venue.id)}
              >
                <p className="text-sm font-semibold text-secondary-50">{item.venue.name}</p>
                <p className="text-xs text-secondary-50/60">{item.venue.city}, {item.venue.state}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-secondary-50/70">Completeness {item.completeness.score}%</span>
                  {item.completeness.review_due ? (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                      Review Due
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary-400/20 px-2 py-0.5 text-[10px] font-semibold text-primary-400">
                      Reviewed
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {selectedItem && (
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
                defaultValue={selectedItem.venue.hourly_rate}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value) && value > 0 && value !== selectedItem.venue.hourly_rate) {
                    void savePatch('hourly_rate', { hourly_rate: value })
                  }
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
                  checked={selectedItem.config.drop_in_enabled}
                  onChange={(event) => {
                    void savePatch('drop_in_enabled', { drop_in_enabled: event.target.checked })
                  }}
                />
                Drop-in enabled
              </label>
              <Input
                type="number"
                min="1"
                step="0.01"
                defaultValue={selectedItem.config.drop_in_price ?? ''}
                placeholder="Drop-in price"
                onBlur={(event) => {
                  const raw = event.target.value.trim()
                  if (raw === '') {
                    void savePatch('drop_in_price', { drop_in_price: null })
                    return
                  }
                  const value = Number(raw)
                  if (Number.isFinite(value) && value > 0) {
                    void savePatch('drop_in_price', { drop_in_price: value })
                  }
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
                  checked={selectedItem.venue.instant_booking}
                  onChange={(event) => {
                    void savePatch('instant_booking', { instant_booking: event.target.checked })
                  }}
                />
                Instant booking
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                <input
                  type="checkbox"
                  checked={selectedItem.venue.insurance_required}
                  onChange={(event) => {
                    void savePatch('insurance_required', { insurance_required: event.target.checked })
                  }}
                />
                Insurance required
              </label>
              <label className="flex items-center gap-2 text-sm text-secondary-50/80">
                <input
                  type="checkbox"
                  checked={selectedItem.config.insurance_requires_manual_approval}
                  onChange={(event) => {
                    void savePatch('insurance_requires_manual_approval', {
                      insurance_requires_manual_approval: event.target.checked,
                    })
                  }}
                />
                Manual insurance approval required
              </label>
              <Input
                defaultValue={selectedItem.config.insurance_document_types.join(', ')}
                placeholder="Insurance document types (comma-separated)"
                onBlur={(event) => {
                  void savePatch('insurance_document_types', {
                    insurance_document_types: parseCommaList(event.target.value),
                  })
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
                defaultValue={selectedItem.config.min_advance_lead_time_hours}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isInteger(value) && value >= 0) {
                    void savePatch('min_advance_lead_time_hours', {
                      min_advance_lead_time_hours: value,
                    })
                  }
                }}
              />
              <Input
                type="time"
                defaultValue={formatTimeForInput(selectedItem.config.same_day_cutoff_time)}
                onBlur={(event) => {
                  const value = event.target.value.trim()
                  void savePatch('same_day_cutoff_time', {
                    same_day_cutoff_time: value ? value : null,
                  })
                }}
              />
              <Input
                type="number"
                min="1"
                step="1"
                defaultValue={selectedItem.venue.max_advance_booking_days}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isInteger(value) && value >= 1) {
                    void savePatch('max_advance_booking_days', {
                      max_advance_booking_days: value,
                    })
                  }
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Operating Hours"
              description="Weekly operating windows used by availability and booking policy validation."
            >
              <OperatingHoursEditor
                value={selectedItem.config.operating_hours}
                onChange={(value) => {
                  void savePatch('operating_hours', { operating_hours: value })
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Blackout Dates + Holidays"
              description="Any listed date blocks booking and availability for this venue."
            >
              <Input
                defaultValue={selectedItem.config.blackout_dates.join(', ')}
                placeholder="Blackout dates: YYYY-MM-DD, YYYY-MM-DD"
                onBlur={(event) => {
                  void savePatch('blackout_dates', {
                    blackout_dates: parseDateList(event.target.value),
                  })
                }}
              />
              <Input
                defaultValue={selectedItem.config.holiday_dates.join(', ')}
                placeholder="Holiday dates: YYYY-MM-DD, YYYY-MM-DD"
                onBlur={(event) => {
                  void savePatch('holiday_dates', {
                    holiday_dates: parseDateList(event.target.value),
                  })
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Amenities Checklist"
              description="Shown on venue cards/details and used for completeness checks."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AMENITY_OPTIONS.map((amenity) => {
                  const checked = selectedItem.venue.amenities.includes(amenity)
                  return (
                    <label key={amenity} className="flex items-center gap-2 text-sm text-secondary-50/80">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const nextAmenities = event.target.checked
                            ? Array.from(new Set([...selectedItem.venue.amenities, amenity]))
                            : selectedItem.venue.amenities.filter((item) => item !== amenity)
                          void savePatch('amenities', { amenities: nextAmenities })
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
              description="Venue-specific cancellation, reschedule, and no-show guidance."
            >
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                defaultValue={selectedItem.config.policy_cancel ?? ''}
                placeholder="Cancellation policy"
                onBlur={(event) => {
                  void savePatch('policy_cancel', { policy_cancel: event.target.value || null })
                }}
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                defaultValue={selectedItem.config.policy_reschedule ?? ''}
                placeholder="Reschedule policy"
                onBlur={(event) => {
                  void savePatch('policy_reschedule', { policy_reschedule: event.target.value || null })
                }}
              />
              <textarea
                className="min-h-20 w-full rounded-md border border-secondary-50/15 bg-secondary-800 px-3 py-2 text-sm text-secondary-50"
                defaultValue={selectedItem.config.policy_no_show ?? ''}
                placeholder="No-show policy"
                onBlur={(event) => {
                  void savePatch('policy_no_show', { policy_no_show: event.target.value || null })
                }}
              />
            </ConfigRow>

            <ConfigRow
              title="Review Cadence"
              description="Control reminder cadence and mark when venue configuration was last reviewed."
            >
              <Input
                type="number"
                min="1"
                max="365"
                defaultValue={selectedItem.config.review_cadence_days}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isInteger(value) && value >= 1 && value <= 365) {
                    void savePatch('review_cadence_days', { review_cadence_days: value })
                  }
                }}
              />
              <div className="flex items-center justify-between rounded-md border border-secondary-50/10 bg-secondary-800 px-3 py-2 text-xs text-secondary-50/70">
                <span>
                  Last reviewed:
                  {' '}
                  {selectedItem.config.last_reviewed_at
                    ? new Date(selectedItem.config.last_reviewed_at).toLocaleString()
                    : 'Never'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void savePatch('mark_reviewed_now', { mark_reviewed_now: true })
                  }}
                >
                  Mark Reviewed
                </Button>
              </div>
            </ConfigRow>
          </section>
        )}
      </div>
    </div>
  )
}

function OperatingHoursEditor({
  value,
  onChange,
}: {
  value: OperatingHourWindow[]
  onChange: (next: OperatingHourWindow[]) => void
}) {
  const [rows, setRows] = useState<OperatingHourWindow[]>(value)

  useEffect(() => {
    setRows(value)
  }, [value])

  const commit = (nextRows: OperatingHourWindow[]) => {
    setRows(nextRows)
    onChange(nextRows)
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${row.day_of_week}-${row.start_time}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <select
            className="rounded-md border border-secondary-50/15 bg-secondary-800 px-2 py-2 text-sm text-secondary-50"
            value={row.day_of_week}
            onChange={(event) => {
              const next = [...rows]
              next[index] = { ...next[index], day_of_week: Number(event.target.value) }
              commit(next)
            }}
          >
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            type="time"
            value={formatTimeForInput(row.start_time)}
            onChange={(event) => {
              const next = [...rows]
              next[index] = { ...next[index], start_time: event.target.value }
              setRows(next)
            }}
            onBlur={(event) => {
              const next = [...rows]
              next[index] = { ...next[index], start_time: event.target.value }
              commit(next)
            }}
          />
          <Input
            type="time"
            value={formatTimeForInput(row.end_time)}
            onChange={(event) => {
              const next = [...rows]
              next[index] = { ...next[index], end_time: event.target.value }
              setRows(next)
            }}
            onBlur={(event) => {
              const next = [...rows]
              next[index] = { ...next[index], end_time: event.target.value }
              commit(next)
            }}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const next = rows.filter((_, rowIndex) => rowIndex !== index)
              commit(next)
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          commit([
            ...rows,
            {
              day_of_week: 1,
              start_time: '09:00:00',
              end_time: '17:00:00',
            },
          ])
        }}
      >
        Add Window
      </Button>
    </div>
  )
}
