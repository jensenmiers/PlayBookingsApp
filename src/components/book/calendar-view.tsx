'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot } from '@fortawesome/free-solid-svg-icons'

// Define time slots
const timeSlots = [
  { label: '6a–8a', id: '6a-8a' },
  { label: '8a–10a', id: '8a-10a' },
  { label: '12p–2p', id: '12p-2p' },
  { label: '2p–4p', id: '2p-4p' },
  { label: '6p–8p', id: '6p-8p' },
  { label: '8p–10p', id: '8p-10p' },
]

// Define days
const days = ['Monday', 'Tuesday', 'Wednes', 'Thurs']

// Mock availability data - true means there's availability, false means empty
// Format: [timeSlot][day] = hasAvailability
const availabilityData: boolean[][] = [
  [true, false, true, true], // 6a-8a
  [false, false, false, true], // 8a-10a
  [false, false, true, true], // 12p-2p
  [false, false, true, true], // 2p-4p
  [true, false, true, true], // 6p-8p
  [true, true, false, true], // 8p-10p
]

const stripedBgStyle: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(150, 117, 90, 0.1) 2px, rgba(150, 117, 90, 0.1) 4px)',
  background:
    'linear-gradient(to bottom right, rgba(247, 243, 239, 0.5), rgba(233, 225, 216, 0.5)), repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(150, 117, 90, 0.1) 2px, rgba(150, 117, 90, 0.1) 4px)',
}

export function CalendarView() {
  const [clickedButton, setClickedButton] = useState<string | null>(null)

  const handleAvailabilityClick = (timeSlotId: string, dayIndex: number) => {
    const buttonId = `${timeSlotId}-${dayIndex}`
    setClickedButton(buttonId)
    setTimeout(() => {
      setClickedButton(null)
    }, 200)
  }

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Location Bar */}
      <section className="px-4 pt-6 pb-4">
        <Button className="w-full bg-white rounded-full px-6 py-4 shadow-soft flex items-center justify-center space-x-3 hover:bg-primary-50 transition duration-200 text-primary-800 font-medium">
          <FontAwesomeIcon icon={faLocationDot} className="text-primary-600" />
          <span>Current location</span>
        </Button>
      </section>

      {/* Availability Grid */}
      <section className="px-4 pb-6">
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {/* Grid Header */}
          <div className="grid grid-cols-5 bg-primary-100">
            <div className="p-4 border-r border-primary-200"></div>
            {days.map((day) => (
              <div key={day} className="p-4 text-center border-r border-primary-200 last:border-r-0">
                <h3 className="font-bold text-primary-800 text-sm">{day}</h3>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          {timeSlots.map((timeSlot, timeIndex) => (
            <div
              key={timeSlot.id}
              className="grid grid-cols-5 border-b border-primary-100 last:border-b-0"
              style={{ minHeight: '80px' }}
            >
              {/* Time Label */}
              <div className="p-4 bg-primary-50 border-r border-primary-200 flex items-center">
                <span className="text-sm font-medium text-primary-700">{timeSlot.label}</span>
              </div>

              {/* Day Cells */}
              {days.map((day, dayIndex) => {
                const hasAvailability = availabilityData[timeIndex][dayIndex]
                const buttonId = `${timeSlot.id}-${dayIndex}`
                const isClicked = clickedButton === buttonId

                return (
                  <div
                    key={`${timeSlot.id}-${day}`}
                    className={`p-3 border-r border-primary-100 last:border-r-0 ${
                      hasAvailability ? '' : 'bg-gradient-to-br from-primary-50/50 to-primary-100/50'
                    }`}
                    style={!hasAvailability ? stripedBgStyle : undefined}
                  >
                    {hasAvailability && (
                      <Button
                        onClick={() => handleAvailabilityClick(timeSlot.id, dayIndex)}
                        className={`w-full h-full bg-white rounded-xl shadow-soft hover:shadow-glass transition duration-200 flex items-center justify-center min-h-[50px] ${
                          isClicked
                            ? 'bg-secondary-100 border-2 border-secondary-400'
                            : 'border-2 border-transparent'
                        }`}
                      >
                        <span className="text-xs font-medium text-primary-700 text-center px-2">
                          Availability Nearby
                        </span>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

