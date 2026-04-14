'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PhotoCarousel } from './photo-carousel'
import { DeferredPhotoLightbox } from './deferred-photo-lightbox'
import { DeferredSlotBookingConfirmation } from './deferred-slot-booking-confirmation'
import { DeferredVenueLocationMap } from './deferred-venue-location-map'
import { DeferredCalendar } from './deferred-calendar'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faShield, faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { GoogleMapsLink } from './shared'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime } from '@/utils/dateHelpers'
import { getBookingModeDisplay } from '@/lib/booking-mode'
import { getCurrentRelativeUrl, peekAuthResumeStateForReturnTo } from '@/lib/auth/authResume'
import { useSlotBookingAuthResume } from '@/lib/auth/useAuthResume'
import type { Venue } from '@/types'

interface VenueDesignEditorialProps {
  venue: Venue
  initialAvailability?: ComputedAvailabilitySlot[]
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

  return getBookingModeDisplay(venue.instant_booking, 'compact').label
}

export function VenueDesignEditorial({
  venue,
  initialAvailability = [],
}: VenueDesignEditorialProps) {
  const router = useRouter()
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerDate, setPickerDate] = useState<Date | undefined>(undefined)
  const bookingMode = getBookingModeDisplay(venue.instant_booking, 'compact')

  const todayStr = getDateStringInTimeZone(new Date(), LOS_ANGELES_TIME_ZONE)
  const datePills = useMemo(
    () => Array.from({ length: DAY_PILLS_COUNT }, (_, i) => addDaysToDateString(todayStr, i)),
    [todayStr]
  )
  const [resumeDateOverride, setResumeDateOverride] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const pendingResumeState = peekAuthResumeStateForReturnTo(getCurrentRelativeUrl())
    if (
      pendingResumeState?.type !== 'slot-booking'
      || pendingResumeState.venueId !== venue.id
      || datePills.includes(pendingResumeState.date)
    ) {
      return null
    }

    return pendingResumeState.date
  })
  const dateFrom = datePills[0]
  const dateTo = datePills[datePills.length - 1]

  const { data: availability, loading } = useVenueAvailabilityRange(
    venue.id,
    dateFrom,
    dateTo,
    { initialData: initialAvailability }
  )

  // Calendar-picked date: fetch availability if outside pill range
  const pickerDateStr = pickerDate ? format(pickerDate, 'yyyy-MM-dd') : null
  const isPickerDateInPillRange = pickerDateStr ? datePills.includes(pickerDateStr) : false
  const offRangeDateStr = pickerDateStr && !isPickerDateInPillRange
    ? pickerDateStr
    : resumeDateOverride

  const { data: pickerAvailability, loading: pickerLoading } = useVenueAvailabilityRange(
    offRangeDateStr ? venue.id : null,
    offRangeDateStr,
    offRangeDateStr
  )

  const bookableSlots = useMemo(() => {
    if (!availability) return []
    return availability
  }, [availability])

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
    if (!offRangeDateStr && !pickerDateStr) return []
    if (isPickerDateInPillRange && pickerDateStr) {
      return slotsByDate.get(pickerDateStr) || []
    }
    if (!pickerAvailability) return []
    return pickerAvailability
  }, [offRangeDateStr, pickerDateStr, isPickerDateInPillRange, slotsByDate, pickerAvailability])

  const resumeSlots = useMemo(() => {
    if (!resumeDateOverride || !pickerAvailability) {
      return bookableSlots
    }

    return [...bookableSlots, ...pickerAvailability]
  }, [bookableSlots, pickerAvailability, resumeDateOverride])

  const resumeLoading = loading || Boolean(resumeDateOverride && pickerLoading)

  const nextSlot = bookableSlots[0]
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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
      className="w-full p-l bg-secondary-800/50 hover:bg-secondary-800 rounded-xl border border-secondary-50/5 hover:border-primary-400/30 text-left transition-all group flex items-center justify-between"
    >
      <div>
        <div className="text-secondary-50 font-medium group-hover:text-primary-400 transition-colors">
          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
        </div>
        <div className="text-xs text-secondary-50/40 mt-xxs">
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

  const handleResumeSlotBooking = useCallback((slot: ComputedAvailabilitySlot) => {
    setResumeDateOverride(null)
    setSelectedSlot(slot)
    setShowBooking(true)
  }, [])

  useSlotBookingAuthResume({
    venueId: venue.id,
    slots: resumeSlots,
    loading: resumeLoading,
    onResume: handleResumeSlotBooking,
  })

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Section */}
      <div className="relative h-[55vh] min-h-[400px]">
        {/* Background Image / Carousel */}
        <PhotoCarousel
          photos={venue.photos || []}
          venueName={venue.name}
          onPhotoTap={(index) => setLightboxIndex(index)}
          priority
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-900 via-secondary-900/60 to-transparent pointer-events-none" />

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-900/50 backdrop-blur-md text-secondary-50/80 hover:text-secondary-50 hover:bg-secondary-900/70 transition-all"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        {/* Editorial Typography - extra bottom padding to clear Reserve card */}
        <div className="absolute bottom-0 left-0 right-0 p-xl pb-5xl z-10 pointer-events-none">
          <div className="max-w-2xl mx-auto">
            <h1 className="font-serif text-4xl sm:text-5xl text-secondary-50 leading-tight mb-s">
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
        <div className="relative -mt-2xl mx-l z-20">
          <div className="bg-secondary-800/90 backdrop-blur-xl rounded-2xl border border-secondary-50/10 shadow-glass overflow-hidden">
            {loading ? (
              <div className="p-xl">
                <div className="h-6 w-32 bg-secondary-50/10 rounded animate-pulse mb-s" />
                <div className="h-4 w-24 bg-secondary-50/10 rounded animate-pulse" />
              </div>
            ) : nextSlot ? (
              <>
                <div className="p-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-secondary-50/50 text-xs uppercase tracking-wider mb-xs">
                        Next Available
                      </div>
                      <div className="text-2xl font-serif text-secondary-50">
                        {getDateDisplay(nextSlot.date)} · {formatTime(nextSlot.start_time)} - {formatTime(nextSlot.end_time)}
                      </div>
                      <div className="flex items-center gap-m mt-s">
                        <span className="text-secondary-50/70">
                          {getSlotPricingLabel(nextSlot, venue)}
                        </span>
                        <span className="text-secondary-50/30">·</span>
                        <span className={`flex items-center gap-xs ${
                          nextSlot.action_type === 'info_only_open_gym'
                            ? 'text-secondary-50/60'
                            : bookingMode.mode === 'instant'
                              ? 'text-primary-400'
                              : 'text-accent-400'
                        }`}>
                          {nextSlot.action_type !== 'info_only_open_gym' && (
                            <FontAwesomeIcon icon={bookingMode.icon} className="text-xs" />
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
                  className="w-full py-l bg-primary-400 hover:bg-primary-500 text-secondary-900 font-semibold text-center transition-colors"
                >
                  {nextSlot.action_type === 'info_only_open_gym' ? 'View Session' : 'Reserve'}
                </button>
              </>
            ) : (
              <div className="p-xl text-center text-secondary-50/50">
                No availability this week
              </div>
            )}
          </div>
        </div>

        {/* Coming Up Section */}
        <div className="px-l mt-xl">
          <h3 className="text-sm font-medium text-secondary-50/60 mb-m tracking-wide uppercase">
            Coming Up
          </h3>

          {/* Day Pills */}
          <div className="flex gap-s overflow-x-auto scrollbar-hide pb-s md:grid md:grid-cols-7 md:overflow-visible">
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
                  className={`flex-shrink-0 px-l py-m rounded-xl text-center transition-all ${
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
                  <div className={`text-xs mt-xxs ${isExpanded ? 'text-secondary-900/70' : 'text-secondary-50/50'}`}>
                    {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                  </div>
                </button>
              )
            })}

            {/* Mobile-only "More" pill in scroll row */}
            <button
              onClick={() => setShowDatePicker((prev) => !prev)}
              aria-label="More dates"
              className={`md:hidden flex-shrink-0 px-l py-m rounded-xl text-center border transition-all ${
                showDatePicker
                  ? 'bg-primary-400 text-secondary-900 border-primary-400'
                  : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border-secondary-50/10'
              }`}
            >
              <div className="text-sm font-medium">More</div>
              <div className={`text-xs mt-xxs ${showDatePicker ? 'text-secondary-900/70' : 'text-secondary-50/50'}`}>
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
            </button>
          </div>

          {/* Desktop-only "More dates" button below pills */}
          <div className="hidden md:flex justify-center mt-m">
          <button
            onClick={() => setShowDatePicker((prev) => !prev)}
            aria-label="More dates"
            className={`inline-flex items-center gap-s px-l py-s rounded-xl text-sm transition-all ${
              showDatePicker
                ? 'bg-primary-400 text-secondary-900'
                : 'bg-secondary-800/60 hover:bg-secondary-800 text-secondary-50 border border-secondary-50/10'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
            <span>{showDatePicker ? 'Hide calendar' : 'More dates'}</span>
          </button>
          </div>

          {/* Calendar Date Picker */}
          {showDatePicker && (
            <div className="mt-m flex justify-center rounded-xl border border-secondary-50/10 bg-secondary-800/60 p-l animate-in slide-in-from-top-2 duration-200">
              <DeferredCalendar
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
            <div className="mt-l space-y-2 animate-in slide-in-from-top-2 duration-200">
              {(slotsByDate.get(expandedDate) || []).map((slot, idx) => renderSlotButton(slot, idx))}
            </div>
          )}

          {/* Expanded Time Slots - from calendar picker selection */}
          {pickerDateStr && !expandedDate && (
            <div className="mt-l space-y-2 animate-in slide-in-from-top-2 duration-200">
              {pickerLoading && !isPickerDateInPillRange ? (
                <div className="p-l text-center text-secondary-50/50">Loading slots...</div>
              ) : pickerSlots.length > 0 ? (
                <>
                  <div className="text-xs text-secondary-50/40 mb-s">
                    {format(pickerDate!, 'EEEE, MMMM d')}
                  </div>
                  {pickerSlots.map((slot, idx) => renderSlotButton(slot, idx, 'picker-'))}
                </>
              ) : (
                <div className="p-l text-center text-secondary-50/50">
                  No availability on {format(pickerDate!, 'EEEE, MMMM d')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="px-l py-2xl space-y-8">
          {/* Location */}
          <section>
            <h2 className="font-serif text-xl text-secondary-50 mb-m">Location</h2>
            <GoogleMapsLink
              address={venue.address}
              city={venue.city}
              state={venue.state}
              zipCode={venue.zip_code}
              variant="default"
              showArrow
              stackAddressOnMobile
            />
          </section>

          {/* About */}
          {venue.description && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-m">About</h2>
              <p className="text-secondary-50/70 leading-relaxed">
                {venue.description}
              </p>
            </section>
          )}

          {/* Amenities */}
          {venue.amenities && venue.amenities.length > 0 && (
            <section>
              <h2 className="font-serif text-xl text-secondary-50 mb-m">Amenities</h2>
              <div className="flex flex-wrap gap-s">
                {venue.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="px-m py-s bg-secondary-50/5 text-secondary-50/70 text-sm rounded-full border border-secondary-50/5"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Insurance Notice */}
          {venue.insurance_required && (
            <section className="flex items-start gap-m p-l bg-accent-400/5 rounded-xl border border-accent-400/10">
              <FontAwesomeIcon icon={faShield} className="text-accent-400 mt-xxs" />
              <div>
                <div className="text-secondary-50 font-medium text-sm">
                  Insurance Required
                </div>
                <div className="text-secondary-50/50 text-xs mt-xxs">
                  Proof of insurance must be verified before booking is confirmed
                </div>
              </div>
            </section>
          )}

          {/* Lightbox */}
          {lightboxIndex !== null && venue.photos && venue.photos.length > 0 && (
            <DeferredPhotoLightbox
              photos={venue.photos}
              venueName={venue.name}
              currentIndex={lightboxIndex}
              onIndexChange={setLightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}

          <section>
            <h2 className="font-serif text-xl text-secondary-50 mb-m">Map</h2>
            <DeferredVenueLocationMap
              name={venue.name}
              city={venue.city}
              state={venue.state}
              latitude={venue.latitude}
              longitude={venue.longitude}
              className="h-56 sm:h-64 md:h-72"
            />
          </section>
        </div>
      </div>

      {/* Booking Dialog */}
      {showBooking && selectedSlot && (
        <DeferredSlotBookingConfirmation
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
