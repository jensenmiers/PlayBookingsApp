/**
 * Conflict detection utilities extracted from check_booking_conflicts() trigger
 */

import type { Booking, RecurringBooking, Availability } from '@/types'

export interface ConflictInfo {
  hasConflict: boolean
  conflictType?: 'time_overlap' | 'availability_unavailable' | 'advance_booking_exceeded'
  conflictingBookingId?: string
  message?: string
}

/**
 * Check if two time ranges overlap
 */
export function checkTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert time strings to minutes for comparison
  const [start1Hours, start1Mins] = start1.split(':').map(Number)
  const [end1Hours, end1Mins] = end1.split(':').map(Number)
  const [start2Hours, start2Mins] = start2.split(':').map(Number)
  const [end2Hours, end2Mins] = end2.split(':').map(Number)
  
  const start1Total = start1Hours * 60 + start1Mins
  const end1Total = end1Hours * 60 + end1Mins
  const start2Total = start2Hours * 60 + start2Mins
  const end2Total = end2Hours * 60 + end2Mins
  
  // Check for overlap: start1 < end2 && end1 > start2
  return start1Total < end2Total && end1Total > start2Total
}

/**
 * Find conflicting bookings for a given time slot
 */
export function findConflictingBookings(
  bookings: Booking[],
  venueId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Booking[] {
  return bookings.filter((booking) => {
    // Skip if excluded
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false
    }
    
    // Must be same venue and date
    if (booking.venue_id !== venueId || booking.date !== date) {
      return false
    }
    
    // Must be pending or confirmed
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false
    }
    
    // Check for time overlap
    return checkTimeOverlap(startTime, endTime, booking.start_time, booking.end_time)
  })
}

/**
 * Find conflicting recurring bookings
 */
export function findConflictingRecurring(
  recurringBookings: RecurringBooking[],
  venueId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeRecurringId?: string
): RecurringBooking[] {
  return recurringBookings.filter((recurring) => {
    // Skip if excluded
    if (excludeRecurringId && recurring.id === excludeRecurringId) {
      return false
    }
    
    // Must be same venue and date
    if (recurring.venue_id !== venueId || recurring.date !== date) {
      return false
    }
    
    // Must be pending or confirmed
    if (recurring.status !== 'pending' && recurring.status !== 'confirmed') {
      return false
    }
    
    // Check for time overlap
    return checkTimeOverlap(startTime, endTime, recurring.start_time, recurring.end_time)
  })
}

/**
 * Check if time slot is available based on availability blocks
 */
export function checkAvailability(
  availabilityBlocks: Availability[],
  venueId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  // Filter availability for this venue and date
  const relevantBlocks = availabilityBlocks.filter(
    (block) => block.venue_id === venueId && block.date === date && block.is_available
  )
  
  if (relevantBlocks.length === 0) {
    return false
  }
  
  // Check if the requested time slot is fully covered by available blocks
  // The slot must be within at least one available block
  return relevantBlocks.some((block) => {
    const blockStart = block.start_time
    const blockEnd = block.end_time
    
    // Check if requested time is within this block
    // startTime >= blockStart && endTime <= blockEnd
    const [reqStartHours, reqStartMins] = startTime.split(':').map(Number)
    const [reqEndHours, reqEndMins] = endTime.split(':').map(Number)
    const [blockStartHours, blockStartMins] = blockStart.split(':').map(Number)
    const [blockEndHours, blockEndMins] = blockEnd.split(':').map(Number)
    
    const reqStartTotal = reqStartHours * 60 + reqStartMins
    const reqEndTotal = reqEndHours * 60 + reqEndMins
    const blockStartTotal = blockStartHours * 60 + blockStartMins
    const blockEndTotal = blockEndHours * 60 + blockEndMins
    
    return reqStartTotal >= blockStartTotal && reqEndTotal <= blockEndTotal
  })
}

/**
 * Comprehensive conflict check combining all validation
 */
export function checkBookingConflicts(
  bookings: Booking[],
  recurringBookings: RecurringBooking[],
  availabilityBlocks: Availability[],
  venueId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): ConflictInfo {
  // Check for conflicting bookings
  const conflictingBookings = findConflictingBookings(
    bookings,
    venueId,
    date,
    startTime,
    endTime,
    excludeBookingId
  )
  
  if (conflictingBookings.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'time_overlap',
      conflictingBookingId: conflictingBookings[0].id,
      message: 'Booking time conflicts with existing booking',
    }
  }
  
  // Check for conflicting recurring bookings
  const conflictingRecurring = findConflictingRecurring(
    recurringBookings,
    venueId,
    date,
    startTime,
    endTime
  )
  
  if (conflictingRecurring.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'time_overlap',
      conflictingBookingId: conflictingRecurring[0].id,
      message: 'Booking time conflicts with existing recurring booking',
    }
  }
  
  // Check availability
  const isAvailable = checkAvailability(availabilityBlocks, venueId, date, startTime, endTime)
  
  if (!isAvailable) {
    return {
      hasConflict: true,
      conflictType: 'availability_unavailable',
      message: 'Requested time slot is not available',
    }
  }
  
  return {
    hasConflict: false,
  }
}

