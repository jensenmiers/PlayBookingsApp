'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AvailabilityWindowPicker } from './availability-window-picker'
import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { buildAvailabilityWindows, CALENDAR_END_MINUTES, CALENDAR_START_MINUTES, getNoticeCutoff, getNoticeMinutesForDate, getRequiredNoticeHours, layoutAvailabilityWindows, timeToMinutes, type AvailabilityWindow } from '@/lib/availabilityCalendar'
import type { VenuePlanningPolicy } from '@/lib/venuePlanning'
import { PLATFORM_TIME_ZONE } from '@/lib/venueAdminConfig'
import { addDaysToDateString, formatTime } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface Props {
  venue: Venue
  startDate: string
  today: string
  now: Date
  slots: ComputedAvailabilitySlot[]
  policy?: Partial<VenuePlanningPolicy> | null
  loading: boolean
  error: string | null
  publishedThrough?: string | null
  onStartDateChange: (date: string) => void
  onSelect: (slot: ComputedAvailabilitySlot) => void
  onRetry: () => void
}

const TIMELINE_MINUTES = CALENDAR_END_MINUTES - CALENDAR_START_MINUTES
const position = (minutes: number) => `${(minutes - CALENDAR_START_MINUTES) / TIMELINE_MINUTES * 100}%`
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
const longDate = (date: string) => dateLabel(date, { month: 'long', day: 'numeric', weekday: 'long' })
const windowLabel = (window: AvailabilityWindow) => `${window.action_type === 'info_only_open_gym' ? 'Open gym' : 'Private rental'} · ${longDate(window.date)} · ${formatTime(window.start_time)}–${formatTime(window.end_time)}`

export function VenueAvailabilityCalendar({ venue, startDate, today, now, slots, policy, loading, error, publishedThrough, onStartDateChange, onSelect, onRetry }: Props) {
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToDateString(startDate, index))
  const [mobileDate, setMobileDate] = useState(startDate)
  const selectedDate = dates.includes(mobileDate) ? mobileDate : startDate
  const [selection, setSelection] = useState<AvailabilityWindow | null>(null)
  const windows = useMemo(() => buildAvailabilityWindows(slots, policy, now).filter(window => window.date >= startDate && window.date <= addDaysToDateString(startDate, 6)), [slots, policy, now, startDate])
  const outside = windows.filter(window => timeToMinutes(window.start_time) < CALENDAR_START_MINUTES || timeToMinutes(window.end_time) > CALENDAR_END_MINUTES)
  const noticeHours = getRequiredNoticeHours(policy)
  const cutoff = getNoticeCutoff(policy, now)
  const ready = !loading && !error
  const choose = (window: AvailabilityWindow) => {
    if (window.action_type === 'info_only_open_gym') onSelect({ ...window.slots[0], start_time: window.start_time, end_time: window.end_time })
    else setSelection(window)
  }
  const navigate = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return
    setSelection(null)
    setMobileDate(date)
    onStartDateChange(date)
  }

  return (
    <section aria-labelledby="venue-availability-title" className="mt-2xl px-l">
      <div className="flex flex-wrap items-end justify-between gap-l mb-l">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary-400 mb-xs">Find your court time</p>
          <h2 id="venue-availability-title" className="font-serif text-3xl text-foreground">Availability</h2>
          <p className="text-sm text-muted-foreground mt-xs">{dateLabel(startDate, { month: 'short', day: 'numeric' })}–{dateLabel(dates[6], { month: 'short', day: 'numeric', year: 'numeric' })} · Pacific time</p>
        </div>
        <div className="flex flex-wrap items-center gap-s">
          <Button variant="outline" size="icon" aria-label="Previous seven days" disabled={startDate <= today} onClick={() => navigate(addDaysToDateString(startDate, -7) < today ? today : addDaysToDateString(startDate, -7))}>←</Button>
          <Button variant="outline" onClick={() => navigate(today)}>Today</Button>
          <Button variant="outline" size="icon" aria-label="Next seven days" onClick={() => navigate(addDaysToDateString(startDate, 7))}>→</Button>
          <label className="sr-only" htmlFor="availability-jump-date">Jump to date</label>
          <input id="availability-jump-date" type="date" min={today} value={startDate} onChange={event => navigate(event.target.value)} className="min-w-0 max-w-full rounded-lg border border-border bg-background px-s py-s text-sm text-foreground [color-scheme:dark]" />
        </div>
      </div>

      {noticeHours > 0 && <div className="mb-l rounded-xl border border-border bg-muted/50 px-l py-m text-sm">
        <p className="font-medium">Requires {noticeHours} hours’ notice for private rentals.</p>
        <p className="mt-xs text-muted-foreground">Earliest permitted start: {new Intl.DateTimeFormat('en-US', { timeZone: PLATFORM_TIME_ZONE, month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(cutoff)}. Availability may start later.</p>
        {venue.booking_mode === 'approval_slots' && <p className="mt-xs text-muted-foreground">Subject to venue confirmation.</p>}
      </div>}

      <div className="flex flex-wrap gap-l mb-m text-xs text-muted-foreground">
        <span className="flex items-center gap-s"><span className="h-s w-s rounded-full bg-primary-400" />Private rental</span>
        <span className="flex items-center gap-s"><span className="h-s w-s rounded-full bg-accent-400" />Open gym</span>
      </div>
      <div aria-live="polite">
        {loading && <p role="status" className="py-l text-muted-foreground">Loading availability…</p>}
        {error && <div role="alert" className="py-l text-destructive">Couldn’t load availability. <Button variant="outline" onClick={onRetry}>Try again</Button></div>}
        {ready && windows.length === 0 && <p className="py-l text-muted-foreground">{publishedThrough && startDate > publishedThrough ? 'The schedule has not been published for these dates yet.' : 'No published availability for these dates.'}</p>}
      </div>
      {ready && publishedThrough && dates[6] > publishedThrough && <p className="mb-m text-sm text-muted-foreground">Published schedule through {longDate(publishedThrough)}. Later dates have not been released.</p>}

      <div className="grid grid-cols-7 gap-xs mb-m md:hidden" aria-label="Choose a day">
        {dates.map(date => <button key={date} aria-label={`View ${longDate(date)}`} aria-pressed={selectedDate === date} onClick={() => setMobileDate(date)} className={`rounded-lg py-m text-center text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selectedDate === date ? 'bg-primary-400 text-secondary-900' : 'bg-muted text-muted-foreground'}`}>
          <span className="block">{dateLabel(date, { weekday: 'short' })}</span><span className="block text-lg font-semibold">{dateLabel(date, { day: 'numeric' })}</span>
        </button>)}
      </div>

      <div className="max-h-[720px] overflow-y-auto rounded-xl border border-border bg-background" aria-label="Availability timeline, 7am to 10pm" aria-busy={loading}>
        <div className="sticky top-0 z-20 grid grid-cols-[3.5rem_minmax(0,1fr)] border-b border-border bg-background md:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="p-s text-xs text-muted-foreground">Time</div>
          {dates.map(date => <div key={date} className={`${date === selectedDate ? 'block' : 'hidden'} md:block border-l border-border px-s py-m text-center ${date === today ? 'bg-primary-400/10 text-primary-400' : 'text-foreground'}`}>
            <span className="text-xs block">{date === today ? 'Today' : dateLabel(date, { weekday: 'short' })}</span>
            <span className="text-lg font-medium">{dateLabel(date, { month: 'short', day: 'numeric' })}</span>
          </div>)}
        </div>
        <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] md:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="relative h-[900px] text-xs text-muted-foreground">
            {Array.from({ length: 16 }, (_, i) => <span key={i} className="absolute right-xs" style={{ top: position((i + 7) * 60), transform: i === 15 ? 'translateY(-100%)' : undefined }}>{(i + 7) % 12 || 12} {i + 7 < 12 ? 'AM' : 'PM'}</span>)}
          </div>
          {dates.map(date => {
            const dayWindows = ready ? windows.filter(window => window.date === date && timeToMinutes(window.end_time) > CALENDAR_START_MINUTES && timeToMinutes(window.start_time) < CALENDAR_END_MINUTES) : []
            const noticeEnd = Math.min(CALENDAR_END_MINUTES, getNoticeMinutesForDate(date, cutoff))
            return <div key={date} aria-label={longDate(date)} className={`${date === selectedDate ? 'block' : 'hidden'} md:block relative h-[900px] min-w-0 border-l border-border`}>
              {Array.from({ length: 30 }, (_, index) => <div key={index} aria-hidden="true" className={`absolute inset-x-0 border-t ${index % 2 ? 'border-dashed border-border/40' : 'border-border'}`} style={{ top: `${index / 30 * 100}%` }} />)}
              {noticeHours > 0 && noticeEnd > CALENDAR_START_MINUTES && <div className="absolute inset-x-0 top-0 overflow-hidden border-b border-dashed border-muted-foreground/40 bg-muted/70 px-s py-s" style={{ height: `${(noticeEnd - CALENDAR_START_MINUTES) / TIMELINE_MINUTES * 100}%` }}>
                <span className="text-xs text-muted-foreground">Within required notice period</span>
              </div>}
              {layoutAvailabilityWindows(dayWindows).map(({ window, lane, laneCount }, index) => {
                const start = Math.max(CALENDAR_START_MINUTES, timeToMinutes(window.start_time))
                const end = Math.min(CALENDAR_END_MINUTES, timeToMinutes(window.end_time))
                const gym = window.action_type === 'info_only_open_gym'
                return <button key={`${window.action_type}-${window.start_time}-${index}`} aria-label={windowLabel(window)} onClick={() => choose(window)} className={`absolute z-10 overflow-hidden rounded-md border-l-2 p-xs text-left text-xs transition-colors focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground ${gym ? 'border-accent-400 bg-accent-400/20 text-accent-200 hover:bg-accent-400/30' : 'border-primary-400 bg-primary-400/20 text-primary-100 hover:bg-primary-400/30'}`} style={{ top: position(start), height: `${(end - start) / TIMELINE_MINUTES * 100}%`, left: `calc(${lane / laneCount * 100}% + 2px)`, width: `calc(${100 / laneCount}% - 4px)` }}>
                  <span className="block font-semibold">{gym ? 'Open gym' : 'Available'}</span>
                  <span className="block mt-xxs">{formatTime(window.start_time)}–{formatTime(window.end_time)}</span>
                  {!gym && end - start >= 90 && <span className="block mt-xs text-primary-200">${venue.hourly_rate}/hr</span>}
                </button>
              })}
            </div>
          })}
        </div>
      </div>
      {ready && outside.length > 0 && <details className="mt-m rounded-xl border border-border p-l">
        <summary className="cursor-pointer text-sm font-medium">Additional times outside this view ({outside.length})</summary>
        <div className="grid gap-s mt-m sm:grid-cols-2">{outside.map((window, index) => <Button key={index} variant="outline" className="h-auto whitespace-normal text-left justify-start" onClick={() => choose(window)}>{windowLabel(window)}</Button>)}</div>
      </details>}
      {selection && ready && <AvailabilityWindowPicker key={`${selection.date}-${selection.start_time}`} window={{ ...selection, slots: slots.filter(slot => selection.slots.some(original => original.date === slot.date && original.start_time === slot.start_time && original.end_time === slot.end_time && original.action_type === slot.action_type && original.slot_instance_id === slot.slot_instance_id)) }} venue={venue} policy={policy} now={now} onClose={() => setSelection(null)} onSelect={onSelect} />}
    </section>
  )
}
