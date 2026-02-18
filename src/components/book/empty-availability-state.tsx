'use client'

import { Button } from '@/components/ui/button'

interface EmptyAvailabilityStateProps {
  onViewTomorrow?: () => void
}

export function EmptyAvailabilityState({ onViewTomorrow }: EmptyAvailabilityStateProps) {
  return (
    <div className="bg-secondary-800 rounded-2xl shadow-soft p-8 text-center">
      <div className="space-y-4">
        <div className="text-secondary-50/60">
          <p className="text-lg font-medium mb-2">No available times today</p>
          <p className="text-sm text-secondary-50/50">
            This venue doesn&apos;t have any available time slots for today.
          </p>
        </div>
        {onViewTomorrow && (
          <Button
            onClick={onViewTomorrow}
            className="bg-secondary-600 hover:bg-secondary-700 text-white font-medium py-2 px-6 rounded-xl transition duration-200"
          >
            View Tomorrow
          </Button>
        )}
      </div>
    </div>
  )
}

