'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PhotoCarousel } from './photo-carousel'
import { DeferredPhotoLightbox } from './deferred-photo-lightbox'
import { DeferredSlotBookingConfirmation } from './deferred-slot-booking-confirmation'
import { DeferredVenueLocationMap } from './deferred-venue-location-map'
import { AvailabilityWindowPicker } from './availability-window-picker'
import { VenueAvailabilityCalendar } from './venue-availability-calendar'
import { buildAvailabilityWindows, isCalendarSlotEligible } from '@/lib/availabilityCalendar'
import { RequestToBookPanel, type RequestToBookPolicy } from './request-to-book-panel'
import { Navigation } from '@/components/layout/navigation'
import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faShield, faCalendarDays, faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { BookingModeChip, GoogleMapsLink, VenuePhotoPillButton } from './shared'
import { VenueFaqSection } from './variants/venue-faq-section'
import { VenueGallerySection } from './variants/venue-gallery-section'
import { useVenueAvailabilityRange, ComputedAvailabilitySlot } from '@/hooks/useVenues'
import { formatTime, getDateStringInTimeZone, addDaysToDateString } from '@/utils/dateHelpers'
import { getBookingModeDisplay, resolveVenueBookingMode } from '@/lib/booking-mode'
import { getCurrentRelativeUrl, peekAuthResumeStateForReturnTo } from '@/lib/auth/authResume'
import { useSlotBookingAuthResume } from '@/lib/auth/useAuthResume'
import { buildVenuePlanningFact } from '@/lib/venuePlanning'
import type { Venue } from '@/types'

interface VenueDesignEditorialProps {
  venue: Venue
  venueAdminConfig?: RequestToBookPolicy | null
  initialAvailability?: ComputedAvailabilitySlot[]
  initialPublishedThrough?: string | null
  faqStyle?: 'none' | 'accordion' | 'tabs' | 'list'
  bottomGallery?: 'none' | 'strip' | 'mosaic' | 'tour'
}

const LOS_ANGELES_TIME_ZONE = 'America/Los_Angeles'
const CALENDAR_DAYS = 7

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
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
  if (slot.action_type === 'info_only_open_gym' && slot.slot_pricing) {
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

  return getBookingModeDisplay(venue, 'compact').label
}

export function VenueDesignEditorial({
  venue,
  venueAdminConfig = null,
  initialAvailability,
  initialPublishedThrough,
  faqStyle = 'none',
  bottomGallery = 'none',
}: VenueDesignEditorialProps) {
  const router = useRouter()
  const bookingMode = resolveVenueBookingMode(venue)
  const isRequestToBook = bookingMode === 'request_to_book'
  const [selectedSlot, setSelectedSlot] = useState<ComputedAvailabilitySlot | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const refreshClock = () => setNow(new Date())
    const interval = window.setInterval(refreshClock, 30_000)
    window.addEventListener('focus', refreshClock)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refreshClock) }
  }, [])
  const [windowStart, setWindowStart] = useState<string | null>(null)

  const todayStr = getDateStringInTimeZone(now, LOS_ANGELES_TIME_ZONE)
  const calendarDates = useMemo(
    () => Array.from({ length: CALENDAR_DAYS }, (_, i) => addDaysToDateString(windowStart && windowStart > todayStr ? windowStart : todayStr, i)),
    [todayStr, windowStart]
  )
  const [resumeDateOverride, setResumeDateOverride] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const pendingResumeState = peekAuthResumeStateForReturnTo(getCurrentRelativeUrl())
    if (
      pendingResumeState?.type !== 'slot-booking'
      || pendingResumeState.venueId !== venue.id
      || calendarDates.includes(pendingResumeState.date)
    ) {
      return null
    }

    return pendingResumeState.date
  })
  const dateFrom = calendarDates[0]
  const dateTo = calendarDates[calendarDates.length - 1]

  const { data: availability, loading, error, refetch, publishedThrough } = useVenueAvailabilityRange(
    isRequestToBook ? null : venue.id,
    dateFrom,
    dateTo,
    { initialData: initialAvailability, initialPublishedThrough }
  )

  const { data: resumeAvailability, loading: resumeAvailabilityLoading } = useVenueAvailabilityRange(
    resumeDateOverride && !isRequestToBook ? venue.id : null,
    resumeDateOverride,
    resumeDateOverride
  )

  const bookableSlots = useMemo(() => {
    if (isRequestToBook || !availability) return []
    return availability.filter(slot => slot.date >= dateFrom && slot.date <= dateTo && isCalendarSlotEligible(slot, venueAdminConfig, now))
  }, [availability, isRequestToBook, dateFrom, dateTo, venueAdminConfig, now])

  const resumeSlots = useMemo(() => {
    if (!resumeDateOverride || !resumeAvailability) {
      return bookableSlots
    }

    return [...bookableSlots, ...resumeAvailability.filter(slot => isCalendarSlotEligible(slot, venueAdminConfig, now))]
  }, [bookableSlots, resumeAvailability, resumeDateOverride, venueAdminConfig, now])

  const resumeLoading = loading || Boolean(resumeDateOverride && resumeAvailabilityLoading)

  const nextSlot = bookableSlots[0]
  const [reserveWindow, setReserveWindow] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const fullBookingModeDisplay = getBookingModeDisplay(venue, 'full')
  const planningFact = buildVenuePlanningFact({ bookingMode, policy: venueAdminConfig })
  const venueQuickFacts = [
    {
      label: 'Rate',
      value: `$${venue.hourly_rate}/hr`,
      detail: 'Standard hourly rate',
      icon: faDollarSign,
    },
    {
      label: 'Booking',
      value: fullBookingModeDisplay.label,
      detail: bookingMode === 'instant_slots'
        ? 'Confirm from available slots'
        : bookingMode === 'request_to_book'
          ? 'No published availability shown'
          : 'Host reviews your request',
      icon: fullBookingModeDisplay.icon,
    },
    {
      label: 'Planning',
      value: planningFact.value,
      detail: planningFact.detail,
      icon: faCalendarDays,
    },
    {
      label: 'Insurance',
      value: venue.insurance_required ? 'Insurance Required' : 'Insurance not required',
      detail: venue.insurance_required ? 'Certificate of insurance required before confirmation' : 'No document upload needed',
      icon: faShield,
    },
  ]

  const getDateDisplay = (dateStr: string) => {
    const date = parseLocalDate(dateStr)
    if (dateStr === todayStr) return `Today ${format(date, 'MMM d')}`
    return format(date, 'EEEE MMM d')
  }

  const handleSlotSelect = (slot: ComputedAvailabilitySlot) => {
    if (!isCalendarSlotEligible(slot, venueAdminConfig, new Date())) { void refetch(); return }
    setSelectedSlot(slot)
    setShowBooking(true)
  }

  const handleResumeSlotBooking = useCallback((slot: ComputedAvailabilitySlot) => {
    setResumeDateOverride(null)
    setSelectedSlot(slot)
    setShowBooking(true)
  }, [setResumeDateOverride, setSelectedSlot, setShowBooking])

  useSlotBookingAuthResume({
    venueId: venue.id,
    slots: resumeSlots,
    loading: resumeLoading,
    onResume: handleResumeSlotBooking,
  })

  return (
    <div className="min-h-screen bg-secondary-900">
      <Navigation />
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

        <div className="absolute bottom-3xl left-l right-l z-20 flex justify-end">
          <VenuePhotoPillButton
            photoCount={(venue.photos || []).length}
            onOpenGallery={() => setLightboxIndex(0)}
          />
        </div>

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
      <div className="max-w-6xl mx-auto">
        {/* Floating Booking Card */}
        <div className="relative -mt-2xl z-20 mx-l md:mx-auto min-w-0 max-w-2xl">
          <div
            data-testid="venue-booking-card"
            className="bg-secondary-800/90 backdrop-blur-xl rounded-2xl border border-secondary-50/10 shadow-glass overflow-hidden"
          >
            {isRequestToBook ? (
              <RequestToBookPanel venue={venue} venueAdminConfig={venueAdminConfig} />
            ) : error ? (
              <div className="p-xl text-center text-muted-foreground">Availability could not be loaded</div>
            ) : loading ? (
              <div className="p-xl">
                <div className="h-6 w-32 bg-secondary-50/10 rounded animate-pulse mb-s" />
                <div className="h-4 w-24 bg-secondary-50/10 rounded animate-pulse" />
              </div>
            ) : nextSlot ? (
              <>
                <div className="p-xl">
                  <div className="flex items-start justify-between gap-l">
                    <div>
                      <div className="text-secondary-50/50 text-xs uppercase tracking-wider mb-xs">
                        {dateFrom === todayStr ? 'Next Available' : 'First available in these dates'}
                      </div>
                      <div className="text-2xl font-serif text-secondary-50">
                        {getDateDisplay(nextSlot.date)} · {formatTime(nextSlot.start_time)} - {formatTime(nextSlot.end_time)}
                      </div>
                      <div className="flex items-center gap-m mt-s">
                        <span className="text-secondary-50/70">
                          {getSlotPricingLabel(nextSlot, venue)}
                        </span>
                        {nextSlot.action_type === 'info_only_open_gym' && (
                          <>
                            <span className="text-secondary-50/30">·</span>
                            <span className="flex items-center gap-xs text-secondary-50/60">
                              <span className="text-sm">
                                {getSlotSecondaryLabel(nextSlot, venue)}
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {nextSlot.action_type !== 'info_only_open_gym' && (
                      <BookingModeChip
                        instantBooking={venue.instant_booking}
                        bookingMode={bookingMode}
                        className="flex-shrink-0"
                      />
                    )}
                  </div>
                </div>

                <button
                  onClick={() => nextSlot.action_type === 'info_only_open_gym' ? handleSlotSelect(nextSlot) : setReserveWindow(true)}
                  className="w-full py-l bg-primary-400 hover:bg-primary-500 text-secondary-900 font-semibold text-center transition-colors"
                >
                  {nextSlot.action_type === 'info_only_open_gym' ? 'View Session' : 'Reserve'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-s p-xl text-center">
                <BookingModeChip instantBooking={venue.instant_booking} bookingMode={bookingMode} />
                <div className="text-secondary-50/50">
                  {dateFrom === todayStr ? 'No availability this week' : 'No availability in these dates'}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isRequestToBook && (
          <VenueAvailabilityCalendar
            venue={venue}
            startDate={dateFrom}
            today={todayStr}
            now={now}
            slots={bookableSlots}
            policy={venueAdminConfig}
            loading={loading}
            error={error}
            publishedThrough={publishedThrough}
            onStartDateChange={setWindowStart}
            onSelect={handleSlotSelect}
            onRetry={refetch}
          />
        )}

        {/* Content Section */}
        <div className="max-w-2xl mx-auto px-l py-2xl space-y-8">
          {/* Quick Facts */}
          <section>
            <h2 className="font-serif text-xl text-secondary-50 mb-m">Good to know</h2>
            <div className="grid gap-s sm:grid-cols-2">
              {venueQuickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-xl border border-secondary-50/10 bg-secondary-800/45 p-l"
                >
                  <div className="flex items-start gap-m">
                    <div className="flex h-xl w-xl flex-shrink-0 items-center justify-center rounded-full bg-secondary-50/10 text-secondary-50/70">
                      <FontAwesomeIcon icon={fact.icon} className="text-xs" />
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-secondary-50/40">
                        {fact.label}
                      </div>
                      <div className="mt-xs text-sm font-semibold text-secondary-50">
                        {fact.value}
                      </div>
                      <div className="mt-xxs text-xs text-secondary-50/50">
                        {fact.detail}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                  Certificate of insurance must be verified before booking is confirmed
                </div>
              </div>
            </section>
          )}

          {/* Bottom Gallery (variant-controlled) */}
          {bottomGallery !== 'none' && venue.photos && venue.photos.length > 0 && (
            <VenueGallerySection
              photos={venue.photos}
              venueName={venue.name}
              style={bottomGallery}
              onPhotoTap={(index) => setLightboxIndex(index)}
            />
          )}

          {/* FAQ Section (variant-controlled) */}
          {faqStyle !== 'none' && (
            <VenueFaqSection venue={venue} venueAdminConfig={venueAdminConfig} style={faqStyle} />
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
        </div>
      </div>

      {reserveWindow && nextSlot && (
        <AvailabilityWindowPicker
          window={buildAvailabilityWindows(bookableSlots, venueAdminConfig, now)[0]}
          venue={venue}
          policy={venueAdminConfig}
          now={now}
          onClose={() => setReserveWindow(false)}
          onSelect={handleSlotSelect}
        />
      )}

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
            void refetch()
          }}
        />
      )}
    </div>
  )
}
