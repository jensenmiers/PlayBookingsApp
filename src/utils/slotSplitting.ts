/**
 * Slot splitting utilities for computing true availability
 * Subtracts booked time ranges from availability slots
 */

import type { Availability, Booking, RecurringBooking } from '@/types'

/** Minimum slot duration in minutes to display */
const MIN_SLOT_DURATION_MINUTES = 60

/** Booking granularity in minutes (slots must align to this) */
const SLOT_GRANULARITY_MINUTES = 30

/**
 * Time range represented in minutes from midnight
 */
interface TimeRange {
  start: number // minutes from midnight
  end: number   // minutes from midnight
}

/**
 * Computed available slot after subtracting bookings
 */
export interface ComputedSlot {
  date: string
  start_time: string
  end_time: string
  venue_id: string
  /** Original availability ID this slot was derived from */
  availability_id: string
}

/**
 * Convert time string (HH:MM or HH:MM:SS) to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10) || 0
  return hours * 60 + minutes
}

/**
 * Convert minutes from midnight to time string (HH:MM:SS)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
}

/**
 * Round time up to next granularity boundary
 */
export function roundUpToGranularity(minutes: number): number {
  return Math.ceil(minutes / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES
}

/**
 * Round time down to previous granularity boundary
 */
export function roundDownToGranularity(minutes: number): number {
  return Math.floor(minutes / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES
}

/**
 * Subtract booked ranges from an availability range, producing remaining gaps
 * 
 * @param availability - The available time range
 * @param bookings - Array of booked time ranges (must be sorted by start time)
 * @returns Array of remaining available time ranges
 */
function subtractBookingsFromRange(
  availability: TimeRange,
  bookings: TimeRange[]
): TimeRange[] {
  if (bookings.length === 0) {
    return [availability]
  }

  const gaps: TimeRange[] = []
  let currentStart = availability.start

  for (const booking of bookings) {
    // Skip bookings that don't overlap with remaining availability
    if (booking.end <= currentStart || booking.start >= availability.end) {
      continue
    }

    // If there's a gap before this booking, add it
    if (booking.start > currentStart) {
      gaps.push({
        start: currentStart,
        end: Math.min(booking.start, availability.end),
      })
    }

    // Move current position past this booking
    currentStart = Math.max(currentStart, booking.end)
  }

  // Add remaining time after last booking
  if (currentStart < availability.end) {
    gaps.push({
      start: currentStart,
      end: availability.end,
    })
  }

  return gaps
}

/**
 * Filter and round gaps to meet minimum duration and granularity requirements
 */
function filterAndRoundGaps(gaps: TimeRange[]): TimeRange[] {
  return gaps
    .map((gap) => ({
      // Round start up and end down to granularity boundaries
      start: roundUpToGranularity(gap.start),
      end: roundDownToGranularity(gap.end),
    }))
    .filter((gap) => {
      // Only keep gaps that meet minimum duration after rounding
      const duration = gap.end - gap.start
      return duration >= MIN_SLOT_DURATION_MINUTES
    })
}

/**
 * Compute available slots for a single availability record after subtracting bookings
 * 
 * @param availability - Single availability record
 * @param bookings - All bookings that might overlap (will be filtered)
 * @param recurringBookings - All recurring bookings that might overlap
 * @returns Array of computed available slots
 */
export function computeAvailableSlotsForAvailability(
  availability: Availability,
  bookings: Booking[],
  recurringBookings: RecurringBooking[]
): ComputedSlot[] {
  // Filter to bookings on same venue and date with active status
  const overlappingBookings = bookings
    .filter((b) => 
      b.venue_id === availability.venue_id &&
      b.date === availability.date &&
      (b.status === 'pending' || b.status === 'confirmed')
    )
    .map((b) => ({
      start: timeToMinutes(b.start_time),
      end: timeToMinutes(b.end_time),
    }))

  // Also include recurring bookings
  const overlappingRecurring = recurringBookings
    .filter((rb) =>
      rb.venue_id === availability.venue_id &&
      rb.date === availability.date &&
      (rb.status === 'pending' || rb.status === 'confirmed')
    )
    .map((rb) => ({
      start: timeToMinutes(rb.start_time),
      end: timeToMinutes(rb.end_time),
    }))

  // Combine and sort all bookings by start time
  const allBookings = [...overlappingBookings, ...overlappingRecurring]
    .sort((a, b) => a.start - b.start)

  const availabilityRange: TimeRange = {
    start: timeToMinutes(availability.start_time),
    end: timeToMinutes(availability.end_time),
  }

  // Compute remaining gaps
  const rawGaps = subtractBookingsFromRange(availabilityRange, allBookings)
  
  // Filter and round to meet requirements
  const validGaps = filterAndRoundGaps(rawGaps)

  // Convert back to slot format
  return validGaps.map((gap) => ({
    date: availability.date,
    start_time: minutesToTime(gap.start),
    end_time: minutesToTime(gap.end),
    venue_id: availability.venue_id,
    availability_id: availability.id,
  }))
}

/**
 * Compute all available slots for a venue's availability records
 * 
 * @param availabilityRecords - Array of availability records for the venue
 * @param bookings - All bookings that might overlap
 * @param recurringBookings - All recurring bookings that might overlap
 * @returns Array of computed available slots, sorted by date and time
 */
export function computeAvailableSlots(
  availabilityRecords: Availability[],
  bookings: Booking[],
  recurringBookings: RecurringBooking[]
): ComputedSlot[] {
  const allSlots: ComputedSlot[] = []

  for (const availability of availabilityRecords) {
    // Skip if not marked as available
    if (!availability.is_available) {
      continue
    }

    const slots = computeAvailableSlotsForAvailability(
      availability,
      bookings,
      recurringBookings
    )
    allSlots.push(...slots)
  }

  // Sort by date, then by start time
  return allSlots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }
    return a.start_time.localeCompare(b.start_time)
  })
}
