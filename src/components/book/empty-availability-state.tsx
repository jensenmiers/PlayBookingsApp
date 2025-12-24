'use client'

import { Button } from '@/components/ui/button'

interface EmptyAvailabilityStateProps {
  onViewTomorrow?: () => void
}

export function EmptyAvailabilityState({ onViewTomorrow }: EmptyAvailabilityStateProps) {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-8 text-center">
      <div className="space-y-4">
        <div className="text-primary-600">
          <p className="text-lg font-medium mb-2">No available times today</p>
          <p className="text-sm text-primary-500">
            This venue doesn't have any available time slots for today.
          </p>
        </div>
        {onViewTomorrow && (
          <Button
            onClick={onViewTomorrow}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-xl transition duration-200"
          >
            View Tomorrow
          </Button>
        )}
      </div>
    </div>
  )
}

