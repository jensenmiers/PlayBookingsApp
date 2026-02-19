'use client'

import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'
import { formatTime, calculateDuration } from '@/utils/dateHelpers'
import type { RecurringType } from '@/types'

interface TicketDatetimeProps {
  date: string
  startTime: string
  endTime: string
  recurringType: RecurringType
  recurringEndDate?: string
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function TicketDatetime({ date, startTime, endTime, recurringType, recurringEndDate }: TicketDatetimeProps) {
  const bookingDate = parseLocalDate(date)
  const duration = calculateDuration(startTime, endTime)

  return (
    <div>
      {/* Day label */}
      <p className="text-secondary-50/40 text-xs uppercase tracking-widest font-medium">
        Game Day
      </p>

      {/* Day of week — dominant */}
      <p className="font-serif text-3xl sm:text-4xl text-secondary-50 mt-1">
        {format(bookingDate, 'EEEE')}
      </p>

      {/* Full date */}
      <p className="text-secondary-50/60 text-lg mt-0.5">
        {format(bookingDate, 'MMMM d, yyyy')}
      </p>

      {/* Time range — monospace scoreboard feel */}
      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-mono text-2xl text-secondary-50 tracking-tight">
          {formatTime(startTime)}
        </span>
        <span className="text-secondary-50/30 text-lg">&mdash;</span>
        <span className="font-mono text-2xl text-secondary-50 tracking-tight">
          {formatTime(endTime)}
        </span>
        <span className="text-secondary-50/40 text-sm ml-1">
          ({duration}h)
        </span>
      </div>

      {/* Recurring badge */}
      {recurringType !== 'none' && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-400/10 rounded-full text-xs text-accent-400 font-medium mt-3">
          <FontAwesomeIcon icon={faRepeat} className="text-[10px]" />
          {recurringType === 'weekly' ? 'Weekly' : 'Monthly'}
          {recurringEndDate && (
            <> until {format(parseLocalDate(recurringEndDate), 'MMM d')}</>
          )}
        </div>
      )}
    </div>
  )
}
