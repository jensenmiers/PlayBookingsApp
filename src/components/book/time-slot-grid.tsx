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
      <div className="bg-white rounded-2xl shadow-soft p-8 text-center text-secondary-600">
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
      <div className="mb-6 last:mb-0">
        <h3 className="text-sm font-semibold text-secondary-700 mb-3 px-2">{label}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end
            return (
              <Button
                key={`${slot.start}-${slot.end}`}
                onClick={() => onSelect(slot)}
                className={`min-h-[44px] rounded-xl shadow-soft transition duration-200 ${
                  isSelected
                    ? 'bg-secondary-600 text-white hover:bg-secondary-700 border-2 border-secondary-700'
                    : 'bg-white text-secondary-700 hover:bg-secondary-50 border-2 border-transparent hover:border-secondary-300'
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
    <div className="bg-white rounded-2xl shadow-soft p-6">
      {venue && !venue.instant_booking && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Note:</span> This venue requires approval for bookings.
          </p>
        </div>
      )}
      {amSlots.length > 0 && renderSlotGroup(amSlots, 'Morning')}
      {pmSlots.length > 0 && renderSlotGroup(pmSlots, 'Afternoon & Evening')}
    </div>
  )
}

