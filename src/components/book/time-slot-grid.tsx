'use client'

import { Button } from '@/components/ui/button'
import type { Venue } from '@/types'

export interface TimeSlot {
  start: string
  end: string
  display: string
  hour: number
}

interface TimeSlotGridProps {
  slots: TimeSlot[]
  selectedSlot: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
  venue: Venue | null
  loading?: boolean
}

export function TimeSlotGrid({
  slots,
  selectedSlot,
  onSelect,
  venue,
  loading = false,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div className="bg-secondary-800 rounded-2xl shadow-soft p-2xl text-center text-secondary-50/60">
        <p>Loading availability...</p>
      </div>
    )
  }

  if (slots.length === 0) {
    return null
  }

  const amSlots = slots.filter((slot) => slot.hour < 12)
  const pmSlots = slots.filter((slot) => slot.hour >= 12)

  const renderSlotGroup = (groupSlots: TimeSlot[], label: string) => {
    if (groupSlots.length === 0) return null

    return (
      <div className="mb-xl last:mb-0">
        <h3 className="text-sm font-semibold text-secondary-50/70 mb-m px-s">{label}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-m">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
            return (
              <Button
                key={`${slot.start}-${slot.end}`}
                onClick={() => onSelect(slot)}
                className={`min-h-[44px] rounded-xl shadow-soft transition duration-200 ${
                  isSelected
                    ? 'bg-secondary-600 text-secondary-50 hover:bg-secondary-700 border-2 border-secondary-700'
                    : 'bg-secondary-800 text-secondary-50/70 hover:bg-secondary-50/10 border-2 border-transparent hover:border-secondary-50/10'
                }`}
              >
                <span className="text-sm font-medium">{slot.display}</span>
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary-800 rounded-2xl shadow-soft p-xl">
      {venue && !venue.instant_booking && (
        <div className="mb-l p-m bg-accent-50 border border-accent-200 rounded-lg">
          <p className="text-xs text-accent-800">
            <span className="font-semibold">Note:</span> This venue requires approval for bookings.
          </p>
        </div>
      )}
      {amSlots.length > 0 && renderSlotGroup(amSlots, 'Morning')}
      {pmSlots.length > 0 && renderSlotGroup(pmSlots, 'Afternoon & Evening')}
    </div>
  )
}

