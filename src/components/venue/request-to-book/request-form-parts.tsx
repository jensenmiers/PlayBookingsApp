'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatTime } from '@/utils/dateHelpers'
import {
  OTHER_ACTIVITY,
  REQUEST_ACTIVITY_OPTIONS,
  hourToTime,
  toHour,
  type RequestToBookForm,
} from './use-request-to-book-form'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const labelClassName = 'text-xs font-medium text-secondary-50/70'
const fieldClassName = 'box-border block w-full min-w-0 max-w-full appearance-none overflow-hidden'
const fieldWrapperClassName = 'relative w-full min-w-0 max-w-full overflow-hidden rounded-lg'
const selectClassName = 'flex h-11 w-full min-w-0 rounded-lg border border-secondary-50/10 bg-secondary-800 px-l text-base text-secondary-50 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary-400 focus-visible:ring-[3px] focus-visible:ring-primary-400/30 md:text-sm'
const textareaClassName = 'flex w-full resize-none rounded-xl border border-input bg-secondary-800/80 px-l py-s text-sm text-secondary-50 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]'

function formatHour(hour: number): string {
  return formatTime(hourToTime(hour))
}

function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'EEE, MMM d, yyyy')
}

/** Label with a red asterisk while the required field is still incomplete. Kept outside <label> so its accessible name stays clean. */
function RequiredLabel({ htmlFor, missing, children }: { htmlFor: string; missing: boolean; children: string }) {
  return (
    <div className="flex items-baseline gap-xxs">
      <label htmlFor={htmlFor} className={labelClassName}>{children}</label>
      {missing ? <span aria-hidden="true" className="text-xs font-medium text-destructive">*</span> : null}
    </div>
  )
}

export function formatRequestDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'EEEE, MMMM d, yyyy')
}

/** Date on its own row; start and end side by side on one row, at every width. */
export function RequestTimeFields({ form }: { form: RequestToBookForm }) {
  return (
    <div className="min-w-0 space-y-m">
      {form.hintWindows.length > 0 ? (
        <div className="space-y-xs">
          <p className={labelClassName}>Usually open</p>
          <div className="flex flex-wrap gap-xs">
            {form.hintWindows.map((hint) => (
              <button
                key={`${hint.day_of_week}-${hint.start_time}-${hint.end_time}`}
                type="button"
                onClick={() => form.applyHint(hint)}
                className="rounded-full border border-secondary-50/15 px-m py-xxs text-xs text-secondary-50/80 transition-colors hover:border-primary-400/50 hover:text-secondary-50"
              >
                {DAY_LABELS[hint.day_of_week]} {formatHour(toHour(hint.start_time))}–{formatHour(toHour(hint.end_time))}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-w-0 space-y-xs">
        <RequiredLabel htmlFor="request-date" missing={!form.date}>Date</RequiredLabel>
        <div className={fieldWrapperClassName}>
          {/* Native picker underneath; its text is hidden so the overlay can show the weekday. */}
          <Input
            id="request-date"
            type="date"
            aria-required="true"
            min={form.minimumRequestDate}
            value={form.date}
            onChange={(event) => form.setDate(event.target.value)}
            onClick={(event) => event.currentTarget.showPicker?.()}
            className={`${fieldClassName} ${form.date ? 'text-transparent' : ''}`}
          />
          {form.date ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-l text-base text-secondary-50 md:text-sm"
            >
              {formatShortDate(form.date)}
            </span>
          ) : null}
        </div>
      </div>

      {/* minmax(0,1fr): default 1fr uses minmax(auto,1fr) so WebKit select min-content widens the column */}
      <div data-testid="request-time-row" className="grid w-full min-w-0 max-w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-m">
        <div className="min-w-0 space-y-xs">
          <RequiredLabel htmlFor="request-start-time" missing={!form.startOptions.includes(toHour(form.startTime))}>
            Start time
          </RequiredLabel>
          <div className={fieldWrapperClassName}>
            <select
              id="request-start-time"
              aria-required="true"
              value={form.startTime}
              onChange={(event) => form.changeStartTime(event.target.value)}
              className={`${selectClassName} ${fieldClassName}`}
            >
              {!form.startOptions.includes(toHour(form.startTime)) ? <option value={form.startTime}>Choose a time</option> : null}
              {form.startOptions.map((hour) => (
                <option key={hour} value={hourToTime(hour)}>{formatHour(hour)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0 space-y-xs">
          <RequiredLabel htmlFor="request-end-time" missing={!form.endOptions.includes(toHour(form.endTime))}>
            End time
          </RequiredLabel>
          <div className={fieldWrapperClassName}>
            <select
              id="request-end-time"
              aria-required="true"
              value={form.endTime}
              onChange={(event) => form.setEndTime(event.target.value)}
              className={`${selectClassName} ${fieldClassName}`}
            >
              {!form.endOptions.includes(toHour(form.endTime)) ? <option value={form.endTime}>Choose a time</option> : null}
              {form.endOptions.map((hour) => (
                <option key={hour} value={hourToTime(hour)}>{formatHour(hour)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {form.startOptions.length === 0 ? (
        <p className="text-sm text-secondary-50/60">The venue isn&apos;t open on this day. Try another date.</p>
      ) : null}
    </div>
  )
}

export function RequestPriceSummary({ form, hourlyRate }: { form: RequestToBookForm; hourlyRate: number }) {
  if (form.hours <= 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-secondary-50/10 bg-secondary-900/40 p-l text-sm">
      <div className="flex items-center justify-between gap-l">
        <span className="text-secondary-50/60">
          ${hourlyRate.toFixed(2)} × {form.hours} {form.hours === 1 ? 'hour' : 'hours'}
        </span>
        <span className="font-semibold text-secondary-50">${form.estimatedTotal.toFixed(2)}</span>
      </div>
      <p className="mt-xs text-xs text-secondary-50/50">
        Estimate only. The venue confirms the final price. No payment now.
      </p>
    </div>
  )
}

export function RequestDetailsFields({ form }: { form: RequestToBookForm }) {
  return (
    <div className="min-w-0 space-y-l">
      <div className="space-y-xs">
        <RequiredLabel htmlFor="request-activity" missing={!form.activity}>What are you planning?</RequiredLabel>
        <select
          id="request-activity"
          aria-required="true"
          value={form.activityChoice}
          onChange={(event) => form.setActivityChoice(event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled>Choose one</option>
          {REQUEST_ACTIVITY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
          <option value={OTHER_ACTIVITY}>{OTHER_ACTIVITY}</option>
        </select>
        {form.activityChoice === OTHER_ACTIVITY ? (
          <Input
            aria-label="Describe your plans"
            aria-required="true"
            value={form.activityOther}
            maxLength={120}
            placeholder="e.g. Volleyball practice"
            onChange={(event) => form.setActivityOther(event.target.value)}
          />
        ) : null}
      </div>

      <div className="space-y-xs">
        <label htmlFor="request-notes" className={labelClassName}>Message to host (optional)</label>
        <textarea
          id="request-notes"
          rows={3}
          value={form.notes}
          onChange={(event) => form.setNotes(event.target.value)}
          className={textareaClassName}
          placeholder="Introduce yourself and tell us what you're planning."
        />
      </div>

      {form.user ? (
        <div className="space-y-xs">
          <RequiredLabel htmlFor="request-phone" missing={!form.phone.trim()}>Phone</RequiredLabel>
          <Input
            id="request-phone"
            aria-required="true"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            maxLength={40}
            placeholder="So the venue can reach you"
            onChange={(event) => form.setPhoneInput(event.target.value)}
          />
        </div>
      ) : null}
    </div>
  )
}

export function RequestFormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-destructive/50 bg-destructive/10 p-m text-sm text-destructive">
      {message}
    </p>
  )
}

export function RequestSuccess({ form }: { form: RequestToBookForm }) {
  return (
    <div>
      <p className="font-serif text-2xl text-secondary-50">Request sent. You&apos;re not booked yet.</p>
      <p className="mt-s text-sm text-secondary-50/70">
        We&apos;ll email you within 24 hours once the venue confirms.
      </p>
      <div className="mt-l rounded-xl border border-secondary-50/10 bg-secondary-900/40 p-l">
        <dl className="space-y-s text-sm">
          <SummaryRow label="Date" value={formatRequestDate(form.date)} />
          <SummaryRow label="Time" value={`${formatTime(form.startTime)} – ${formatTime(form.endTime)}`} />
          <SummaryRow label="Planning" value={form.activity} />
          <SummaryRow label="Estimated total" value={`$${form.estimatedTotal.toFixed(2)}`} />
        </dl>
      </div>
      <Button asChild variant="outline" className="mt-l w-full">
        <Link href="/my-bookings">View my requests</Link>
      </Button>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-l">
      <dt className="text-secondary-50/50">{label}</dt>
      <dd className="font-medium text-secondary-50">{value}</dd>
    </div>
  )
}
