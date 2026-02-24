'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faBolt, faShield, faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { SlotBookingConfirmation } from '@/components/booking/slot-booking-confirmation'
import { Calendar } from '@/components/ui/calendar'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime } from '@/utils/dateHelpers'
import type { Venue } from '@/types'

interface VenueDesignEditorialProps {
  venue: Venue
}

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const DAY_PILLS_COUNT = 7

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr)
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}

function getTimePartsInTimeZone(date: Date, timeZone: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

function getDateStringInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getTimePartsInTimeZone(date, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getNextTopOfHourMinutesInTimeZone(date: Date, timeZone: string): number | null {
  const { hour, minute, second } = getTimePartsInTimeZone(date, timeZone)
  const isExactlyTopOfHour = minute === 0 && second === 0 && date.getMilliseconds() === 0
  const nextHour = isExactlyTopOfHour ? hour : hour + 1
  if (nextHour >= 24) return null
  return nextHour * 60
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

function formatCurrencyFromCents(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100)
}

function getSlotPricingLabel(slot: ComputedAvailabilitySlot, venue: Venue): string {
  if (slot.slot_pricing) {
    const unitSuffixMap = {
      hour: '/hr',
      person: '/person',
      session: '/session',
    } as const
    return `${formatCurrencyFromCents(slot.slot_pricing.amount_cents, slot.slot_pricing.currency)}${unitSuffixMap[slot.slot_pricing.unit]}`
  }

  if (slot.action_type === 'info_only_open_gym') {
    return 'Drop-in pricing on site'
  }

  return `$${venue.hourly_rate}/hr`
}

function getSlotSecondaryLabel(slot: ComputedAvailabilitySlot, venue: Venue): string {
  if (slot.action_type === 'info_only_open_gym') {
    const paymentMethod = slot.slot_pricing?.payment_method || 'on_site'
    return paymentMethod === 'on_site' ? 'Pay on site' : 'Pay in app'
  }

  return venue.instant_booking ? 'Instant' : 'Approval'
}

export function VenueDesignEditorial({ venue }: VenueDesignEditorialProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerDate, setPickerDate] = useState<Date | undefined>(undefined)

  const todayStr = getDateStringInTimeZone(new Date(), LOS_ANGELES_TIME_ZONE)
  const datePills = useMemo(
    () => Array.from({ length: DAY_PILLS_COUNT }, (_, i) => addDaysToDateString(todayStr, i)),
    [todayStr]
  )
  const dateFrom = datePills[0]
  const dateTo = datePills[datePills.length - 1]

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo
  )

  // Calendar-picked date: fetch availability if outside pill range
  const pickerDateStr = pickerDate ? format(pickerDate, 'yyyy-MM-dd') : null
  const isPickerDateInPillRange = pickerDateStr ? datePills.includes(pickerDateStr) : false

  const { data: pickerAvailability, loading: pickerLoading } = useVenueAvailabilityRange(
    !isPickerDateInPillRange && pickerDateStr ? venue.id : null,
    pickerDateStr,
    pickerDateStr
  )

  const isSlotBookable = useCallback((slotDate: string, slotStartTime: string): boolean => {
    if (slotDate !== todayStr) return true
    const nextTopHourMinutes = getNextTopOfHourMinutesInTimeZone(
      new Date(),
      LOS_ANGELES_TIME_ZONE
    )
    if (nextTopHourMinutes === null) return false
    return timeToMinutes(slotStartTime) >= nextTopHourMinutes
  }, [todayStr])

  const bookableSlots = useMemo(() => {
    if (!availability) return []
    return availability.filter((slot) =>
      isSlotBookable(slot.date, slot.start_time)
    )
  }, [availability, isSlotBookable])

  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, ComputedAvailabilitySlot[]>()
    for (const date of datePills) {
      grouped.set(date, [])
    }
    for (const slot of bookableSlots) {
      const existing = grouped.get(slot.date) || []
      grouped.set(slot.date, [...existing, slot])
    }
    return grouped
  }, [datePills, bookableSlots])

  const pickerSlots = useMemo(() => {
    if (!pickerDateStr) return []
    if (isPickerDateInPillRange) {
      return slotsByDate.get(pickerDateStr) || []
    }
    if (!pickerAvailability) return []
    return pickerAvailability.filter((slot) =>
      isSlotBookable(slot.date, slot.start_time)
    )
  }, [pickerDateStr, isPickerDateInPillRange, slotsByDate, pickerAvailability, isSlotBookable])

  const nextSlot = bookableSlots[0]
  const primaryPhoto = venue.photos?.[0]

  const getDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEEE')
  }

  const getShortDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today'
    const date = parseLocalDate(dateStr)
    return format(date, 'EEE')
  }

  const handleDateClick = (date: string) => {
    const slots = slotsByDate.get(date) || []
    if (slots.length === 0) return
    setExpandedDate((prev) => (prev === date ? null : date))
    setPickerDate(undefined)
    setShowDatePicker(false)
  }

  const handlePickerDateSelect = (date: Date | undefined) => {
    setPickerDate(date)
    setExpandedDate(null)
  }

  const renderSlotButton = (slot: ComputedAvailabilitySlot, idx: number, keyPrefix = '') => (
    <button
      key={`${keyPrefix}${slot.date}-${slot.start_time}-${idx}`}
      onClick={() => handleSlotSelect(slot)}
      className="w-full p-4 bg-secondary-800/50 hover:bg-secondary-800 rounded-xl border border-secondary-50/5 hover:border-primary-400/30 text-left transition-all group flex items-center justify-between"
    >
      <div>
        <div className="text-secondary-50 font-medium group-hover:text-primary-400 transition-colors">
          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
        </div>
        <div className="text-xs text-secondary-50/40 mt-0.5">
          {getSlotPricingLabel(slot, venue)}
          {slot.action_type === 'info_only_open_gym' ? ` · ${getSlotSecondaryLabel(slot, venue)}` : ''}
        </div>
      </div>
      <div className="text-sm text-secondary-50/30 group-hover:text-primary-400 transition-colors">
        {slot.action_type === 'info_only_open_gym' ? 'Details →' : 'Book →'}
      </div>
    </button>
  )

  const handleSlotSelect = (slot: ComputedAvailabilitySlot) => {
    setSelectedSlot(slot)
    setShowBooking(true)
  }

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Section */}
      <div className="relative h-[55vh] min-h-[400px]">
        {/* Background Image */}
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 to-secondary-900" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-secondary-900/60 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-900/50 backdrop-blur-md text-secondary-50/80 hover:text-secondary-50 hover:bg-secondary-900/70 transition-all"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        {/* Editorial Typography - extra bottom padding to clear Reserve card */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-16 z-10">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-serif text-4xl sm:text-5xl text-secondary-50 leading-tight mb-2">
              {venue.name}
            </h1>
            <p className="text-secondary-50/60 text-lg">
              {venue.city}, {venue.state}
            </p>
          </div>
        </div>
      </div>

      {/* Content Container - constrained width for desktop */}
      <div className="max-w-2xl mx-auto">
        {/* Floating Booking Card */}
        <div className="relative -mt-8 mx-4 z-20">
          <div className="bg-secondary-800/90 backdrop-blur-xl rounded-2xl border border-secondary-50/10 shadow-glass overflow-hidden">
            {loading ? (
              <div className="p-5">
                <div className="h-6 w-32 bg-secondary-50/10 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-secondary-50/10 rounded animate-pulse" />
              </div>
            ) : nextSlot ? (
              <>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-secondary-50/50 text-xs uppercase tracking-wider mb-1">
                        Next Available
                      </div>
                      <div className="text-2xl font-serif text-secondary-50">
                        {getDateDisplay(nextSlot.date)} · {formatTime(nextSlot.start_time)} - {formatTime(nextSlot.end_time)}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-secondary-50/70">
                          {getSlotPricingLabel(nextSlot, venue)}
                        </span>
                        <span className="text-secondary-50/30">·</span>
                        <span className={`flex items-center gap-1 ${
                          nextSlot.action_type === 'info_only_open_gym'
                            ? 'text-secondary-50/60'
                            : venue.instant_booking
                              ? 'text-primary-400'
                              : 'text-accent-400'
                        }`}>
                          {nextSlot.action_type !== 'info_only_open_gym' && (
                            <FontAwesomeIcon icon={faBolt} className="text-xs" />
                          )}
                          <span className="text-sm">
                            {getSlotSecondaryLabel(nextSlot, venue)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSlotSelect(nextSlot)}
                  className="w-full py-4 bg-primary-400 hover:bg-primary-500 text-secondary-900 font-semibold text-center transition-colors"
                >
                  {nextSlot.action_type === 'info_only_open_gym' ? 'View Session' : 'Reserve'}
                </button>
              </>
            ) : (
              <div className="p-5 text-center text-secondary-50/50">
                No availability this week
              </div>
            )}
          </div>
        </div>

        {/* Coming Up Section */}
        <div className="px-4 mt-6">
          <h3 className="text-sm font-medium text-secondary-50/60 mb-3 tracking-wide uppercase">
            Coming Up
          </h3>

          {/* Day Pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {datePills.map((date) => {
              const slots = slotsByDate.get(date) || []
              const slotCount = slots.length
              const isExpanded = expandedDate === date
              const isDisabled = slotCount === 0

              return (
                <button
                  key={date}
                  onClick={() => handleDateClick(date)}
                  disabled={isDisabled}
                  aria-label={`coming-up-day-${date}`}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-center transition-all ${
                    isExpanded
                      ? 'bg-primary-400 text-secondary-900'
                      : isDisabled
                        ? 'bg-secondary-50/5 text-secondary-50/40 border border-secondary-50/10 cursor-not-allowed'
                        : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border border-secondary-50/10'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {getShortDateDisplay(date)}
                  </div>
                  <div className={`text-xs mt-0.5 ${isExpanded ? 'text-secondary-900/70' : 'text-secondary-50/50'}`}>
                    {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                  </div>
                </button>
              )
            })}

            {/* Mobile-only "More" pill in scroll row */}
            <button
              onClick={() => setShowDatePicker((prev) => !prev)}
              aria-label="More dates"
              className={`md:hidden flex-shrink-0 px-4 py-2.5 rounded-xl text-center border transition-all ${
                showDatePicker
                  ? 'bg-primary-400 text-secondary-900 border-primary-400'
                  : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border-secondary-50/10'
              }`}
            >
              <div className="text-sm font-medium">More</div>
              <div className={`text-xs mt-0.5 ${showDatePicker ? 'text-secondary-900/70' : 'text-secondary-50/50'}`}>
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
            </button>
          </div>

          {/* Desktop-only "More dates" button below pills */}
          <button
            onClick={() => setShowDatePicker((prev) => !prev)}
            aria-label="More dates"
            className={`hidden md:inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm transition-all ${
              showDatePicker
                ? 'bg-primary-400 text-secondary-900'
                : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border border-secondary-50/10'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
            <span>{showDatePicker ? 'Hide calendar' : 'More dates'}</span>
          </button>

          {/* Calendar Date Picker */}
          {showDatePicker && (
            <div className="mt-3 rounded-xl border border-secondary-50/10 bg-secondary-800/60 p-4 animate-in slide-in-from-top-2 duration-200">
              <Calendar
                mode="single"
                selected={pickerDate}
                defaultMonth={new Date()}
                onSelect={handlePickerDateSelect}
                disabled={(date) => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return date < today
                }}
                className="bg-transparent text-secondary-50"
                classNames={{
                  today: 'bg-secondary-700 text-secondary-50 rounded-md data-[selected=true]:rounded-none',
                  caption_label: 'text-secondary-50 select-none font-medium text-sm',
                  weekday: 'text-secondary-50/50 rounded-md flex-1 font-normal text-[0.8rem] select-none',
                  outside: 'text-secondary-50/20 aria-selected:text-secondary-50/20',
                  disabled: 'text-secondary-50/20 opacity-50',
                }}
              />
            </div>
          )}

          {/* Expanded Time Slots - from pill selection */}
          {expandedDate && (slotsByDate.get(expandedDate) || []).length > 0 && (
            <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {(slotsByDate.get(expandedDate) || []).map((slot, idx) => renderSlotButton(slot, idx))}
            </div>
          )}

          {/* Expanded Time Slots - from calendar picker selection */}
          {pickerDateStr && !expandedDate && (
            <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
              {pickerLoading && !isPickerDateInPillRange ? (
                <div className="p-4 text-center text-secondary-50/50">Loading slots...</div>
              ) : pickerSlots.length > 0 ? (
                <>
                  <div className="text-xs text-secondary-50/40 mb-2">
                    {format(pickerDate!, 'EEEE, MMMM d')}
                  </div>
                  {pickerSlots.map((slot, idx) => renderSlotButton(slot, idx, 'picker-'))}
                </>
              ) : (
                <div className="p-4 text-center text-secondary-50/50">
                  No availability on {format(pickerDate!, 'EEEE, MMMM d')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="px-4 py-8 space-y-8">
          {/* Location */}
          <section>
            <h2 className="font-serif text-xl text-secondary-50 mb-3">Location</h2>
            <GoogleMapsLink
              address={venue.address}
              city={venue.city}
              state={venue.state}
              zipCode={venue.zip_code}
              variant="default"
              showArrow
            />
          </section>

          {/* About */}
          {venue.description && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">About</h2>
              <p className="text-secondary-50/70 leading-relaxed">
                {venue.description}
              </p>
            </section>
          )}

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-secondary-50/5 text-secondary-50/70 text-sm rounded-full border border-secondary-50/5"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Insurance Notice */}
          {venue.insurance_required && (
            <section className="flex items-start gap-3 p-4 bg-accent-400/5 rounded-xl border border-accent-400/10">
              <FontAwesomeIcon icon={faShield} className="text-accent-400 mt-0.5" />
              <div>
                <div className="text-secondary-50 font-medium text-sm">
                  Insurance Required
                </div>
                <div className="text-secondary-50/50 text-xs mt-0.5">
                  Proof of insurance must be verified before booking is confirmed
                </div>
              </div>
            </section>
          )}

          {/* Photo Gallery */}
          {venue.photos && venue.photos.length > 1 && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-3">Gallery</h2>
              <div className="grid grid-cols-2 gap-2">
                {venue.photos.slice(1, 5).map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden"
                  >
                    <Image
                      src={photo}
                      alt={`${venue.name} photo ${i + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Booking Dialog */}
      {showBooking && selectedSlot && (
        <SlotBookingConfirmation
          venue={venue}
          date={selectedSlot.date}
          startTime={selectedSlot.start_time}
          endTime={selectedSlot.end_time}
          slotActionType={selectedSlot.action_type}
          slotInstanceId={selectedSlot.slot_instance_id}
          slotModalContent={selectedSlot.modal_content}
          open={showBooking}
          onOpenChange={setShowBooking}
          onSuccess={() => {
            setShowBooking(false)
            setSelectedSlot(null)
          }}
        />
      )}
    </div>
  )
}
