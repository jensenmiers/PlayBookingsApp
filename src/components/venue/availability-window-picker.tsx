'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { type AvailabilityWindow, isCalendarSlotEligible } from '@/lib/availabilityCalendar'
import type { VenuePlanningPolicy } from '@/lib/venuePlanning'
import type { Venue } from '@/types'
import { calculateDuration, formatTime } from '@/utils/dateHelpers'

export function AvailabilityWindowPicker({ window, venue, policy, now, onClose, onSelect }: {
  window: AvailabilityWindow
  venue: Venue
  policy?: Partial<VenuePlanningPolicy> | null
  now: Date
  onClose: () => void
  onSelect: (slot: ComputedAvailabilitySlot) => void
}) {
  const slots = window.slots.filter(slot => isCalendarSlotEligible(slot, policy, now))
  const [start, setStart] = useState(window.slots[0]?.start_time || '')
  const [end, setEnd] = useState(window.slots[0]?.end_time || '')
  const [expired, setExpired] = useState(false)
  const choices = slots.filter(slot => slot.start_time === start)
  const selected = choices.find(slot => slot.end_time === end) || choices[0]
  const duration = selected ? calculateDuration(selected.start_time, selected.end_time) : 0
  const inputClass = 'w-full rounded-lg border border-border bg-background px-m py-s text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your rental time</DialogTitle>
          <DialogDescription>
            {venue.name} · {new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${window.date}T12:00:00Z`))}
            <br />{formatTime(window.start_time)}–{formatTime(window.end_time)} available · ${venue.hourly_rate}/hr
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-l">
          <label className="space-y-s text-sm">Start time
            <select className={inputClass} value={start} onChange={event => { setStart(event.target.value); setExpired(false) }}>
              {[...new Set(slots.map(slot => slot.start_time))].map(time => <option key={time} value={time}>{formatTime(time)}</option>)}
            </select>
          </label>
          <label className="space-y-s text-sm">Duration
            <select className={inputClass} value={selected?.end_time || ''} onChange={event => setEnd(event.target.value)}>
              {[...new Set(choices.map(slot => slot.end_time))].map(time => {
                const hours = calculateDuration(start, time)
                return <option key={time} value={time}>{hours} {hours === 1 ? 'hour' : 'hours'}</option>
              })}
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">Start times and durations reflect this venue’s published booking options.</p>
        {window.action_type === 'request_private' && <p className="text-sm">Subject to venue confirmation.</p>}
        {selected && <p className="text-lg font-semibold">${(duration * venue.hourly_rate).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">rental subtotal</span></p>}
        {(!selected || expired) && <p role="alert" className="text-sm text-destructive">This start time no longer meets the required notice. Choose a later time.</p>}
        <Button disabled={!selected || expired} onClick={() => {
          if (!selected || !isCalendarSlotEligible(selected, policy, new Date())) { setExpired(true); return }
          onSelect(selected)
          onClose()
        }}>Continue to booking</Button>
      </DialogContent>
    </Dialog>
  )
}
