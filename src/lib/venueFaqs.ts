import type { Venue } from '@/types'
import { resolveVenueBookingMode } from '@/lib/booking-mode'
import { buildVenuePlanningFact, type VenuePlanningPolicy } from '@/lib/venuePlanning'

export interface VenueFaq {
  group: 'Booking' | 'Space' | 'Policies'
  q: string
  a: string
}

export function buildVenueFaqs(
  venue: Venue,
  venueAdminConfig?: Partial<VenuePlanningPolicy> | null
): VenueFaq[] {
  const faqs: VenueFaq[] = []
  const bookingMode = resolveVenueBookingMode(venue)

  // --- Booking ---
  if (bookingMode === 'instant_slots') {
    faqs.push({
      group: 'Booking',
      q: 'How do I reserve this space?',
      a: `${venue.name} supports instant booking — pick your date and time, confirm, and you're all set. No waiting for host approval.`,
    })
  } else if (bookingMode === 'request_to_book') {
    faqs.push({
      group: 'Booking',
      q: 'How do I reserve this space?',
      a: 'Request your preferred time and PlayBookings will follow up after reviewing your request.',
    })
  } else {
    faqs.push({
      group: 'Booking',
      q: 'How do I reserve this space?',
      a: `Select a time slot and submit a booking request. The host will review and confirm your reservation, usually within 24 hours.`,
    })
  }

  const rate = venue.hourly_rate
  if (venue.weekend_rate && venue.weekend_rate !== rate) {
    faqs.push({
      group: 'Booking',
      q: 'What does it cost?',
      a: `The weekday rate is $${rate}/hr. Weekend bookings (Saturday & Sunday) are $${venue.weekend_rate}/hr.`,
    })
  } else {
    faqs.push({
      group: 'Booking',
      q: 'What does it cost?',
      a: `The hourly rate is $${rate}/hr.`,
    })
  }

  const planningFact = buildVenuePlanningFact({ bookingMode, policy: venueAdminConfig })
  faqs.push({
    group: 'Booking',
    q: planningFact.value.includes('at least') ? 'How much notice do I need?' : 'How far in advance can I book?',
    a: `${planningFact.value}. ${planningFact.detail}.`,
  })

  // --- Space ---
  faqs.push({
    group: 'Space',
    q: 'Where is this venue located?',
    a: `${venue.name} is located at ${venue.address}, ${venue.city}, ${venue.state} ${venue.zip_code}.`,
  })

  if (venue.amenities && venue.amenities.length > 0) {
    const list = venue.amenities.join(', ')
    faqs.push({
      group: 'Space',
      q: 'What amenities are included?',
      a: `This venue includes: ${list}.`,
    })
  }

  if (venue.venue_type) {
    faqs.push({
      group: 'Space',
      q: 'What type of space is this?',
      a: `This venue is categorized as a ${venue.venue_type}.`,
    })
  }

  // --- Policies ---
  if (venue.insurance_required) {
    faqs.push({
      group: 'Policies',
      q: 'Is insurance required?',
      a: 'Yes — this venue requires insurance, and proof must be verified before your booking is confirmed. You may be asked to provide a certificate of insurance that matches the host requirements.',
    })
  } else {
    faqs.push({
      group: 'Policies',
      q: 'Is insurance required?',
      a: 'No, insurance is not required to book this venue.',
    })
  }

  faqs.push({
    group: 'Policies',
    q: 'What is the cancellation policy?',
    a: "Please refer to the host's cancellation terms when completing your reservation. You can reach out to the host directly through PlayBookings for specific questions.",
  })

  return faqs
}
