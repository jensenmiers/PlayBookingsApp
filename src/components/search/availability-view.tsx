'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSearch,
  faCalendarDays,
  faClock,
  faSliders,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { useAvailabilitySlots } from '@/hooks/useVenues'
import { AvailabilityCard } from '@/components/search/availability-card'
import { VenueCardSkeleton } from '@/components/search/venue-card-skeleton'
import { ErrorMessage } from '@/components/ui/error-message'
import { addDays, subDays } from 'date-fns'

export function AvailabilityView() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [selectedTime] = useState<string>('Any time')

  const { data: availabilitySlots, loading, error, refetch } = useAvailabilitySlots({
    date: selectedDate,
    time: selectedTime,
  })

  const handleDateChange = (direction: 'prev' | 'next') => {
    // Parse selectedDate as local date to avoid UTC timezone shift
    const [y, m, d] = selectedDate.split('-').map(Number)
    const currentDate = new Date(y, m - 1, d)
    const newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1)
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  const handleTodayClick = () => {
    setSelectedDate(format(today, 'yyyy-MM-dd'))
  }

  // Parse selectedDate as local date to avoid UTC timezone shift
  const [year, month, day] = selectedDate.split('-').map(Number)
  const parsedDate = new Date(year, month - 1, day) // month is 0-indexed
  const formattedDate = format(parsedDate, 'EEE, MMM d')
  const isToday = selectedDate === format(today, 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-background">
      {/* Search and Filter Section */}
      <section className="px-l pt-xl pb-l">
        <div className="mb-l">
          <h2 className="text-2xl font-bold text-secondary-50 mb-s">Find Available Slots</h2>
          <p className="text-secondary-50/60">Browse and book available time slots</p>
        </div>

        <div className="relative mb-l">
          <div className="absolute inset-y-0 left-0 pl-l flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-secondary-50/30" />
          </div>
          <Input
            type="text"
            placeholder="Search by location or venue name"
            className="w-full pl-4xl pr-l py-l bg-secondary-800 rounded-2xl shadow-soft"
          />
        </div>

        <div className="flex space-x-3 mb-xl overflow-x-auto pb-s">
          {/* Date Filter Button */}
          <div className="flex-shrink-0 flex items-center gap-s">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('prev')}
              className="h-10 w-10 rounded-xl bg-secondary-800 shadow-soft text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
            </Button>
            <Button
              className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-l py-m shadow-soft text-secondary-50/70 hover:bg-secondary-50/10 whitespace-nowrap"
              onClick={handleTodayClick}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="text-secondary-50/60" />
              <span>{formattedDate}</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-xs" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDateChange('next')}
              className="h-10 w-10 rounded-xl bg-secondary-800 shadow-soft text-secondary-50/70 hover:bg-secondary-50/10"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
            </Button>
          </div>

          {/* Time Filter Button */}
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-l py-m shadow-soft text-secondary-50/70 hover:bg-secondary-50/10">
              <FontAwesomeIcon icon={faClock} className="text-secondary-50/60" />
              <span className="whitespace-nowrap">{selectedTime}</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-xs ml-xs" />
            </Button>
          </div>

          {/* Filters Button */}
          <div className="flex-shrink-0">
            <Button className="flex items-center space-x-2 bg-secondary-800 rounded-xl px-l py-m shadow-soft text-secondary-50/70 hover:bg-secondary-50/10">
              <FontAwesomeIcon icon={faSliders} className="text-secondary-50/60" />
              <span className="whitespace-nowrap">Filters</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Availability Slots List */}
      <section className="px-l pb-xl">
        {loading ? (
          <div className="space-y-4">
            <VenueCardSkeleton />
            <VenueCardSkeleton />
            <VenueCardSkeleton />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <ErrorMessage error={error} title="Failed to load availability slots" />
            <Button
              onClick={() => refetch()}
              className="w-full bg-secondary-600 hover:bg-secondary-700 text-secondary-50 font-medium py-m rounded-xl transition duration-200"
            >
              Try Again
            </Button>
          </div>
        ) : availabilitySlots && availabilitySlots.length > 0 ? (
          <div className="space-y-4">
            {availabilitySlots.map((slot) => (
              <AvailabilityCard key={slot.id} availability={slot} />
            ))}
          </div>
        ) : (
          <div className="text-center py-2xl text-secondary-50/60">
            <p className="text-lg font-medium mb-s">No available slots found</p>
            <p className="text-sm">
              {isToday
                ? 'No slots available starting from the next hour today.'
                : `No slots available for ${formattedDate}.`}
            </p>
            <p className="text-sm mt-s">Try selecting a different date or time.</p>
            <a 
              href="/venues" 
              className="inline-block mt-l text-secondary-50/70 hover:text-secondary-50 font-medium underline"
            >
              Or browse all venues
            </a>
          </div>
        )}
      </section>
    </div>
  )
}



