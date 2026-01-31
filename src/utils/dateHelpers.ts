/**
 * Date manipulation utilities for booking system
 */

import { BUSINESS_RULES } from '@/types'

/**
 * Parse a date string (YYYY-MM-DD) as local midnight, avoiding UTC parsing issues
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed
}

/**
 * Check if a booking date is within the advance booking window
 */
export function isWithinAdvanceWindow(
  date: Date | string,
  maxAdvanceDays: number = BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS
): boolean {
  // Parse date string as local date to avoid UTC timezone shift
  const bookingDate = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  bookingDate.setHours(0, 0, 0, 0)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
  
  return bookingDate >= today && bookingDate <= maxDate
}

/**
 * Check if cancellation is within the allowed window (48 hours before booking)
 */
export function isWithinCancellationWindow(
  bookingDate: Date | string,
  hoursBefore: number = BUSINESS_RULES.CANCELLATION_NOTICE_HOURS
): boolean {
  const date = typeof bookingDate === 'string' ? new Date(bookingDate) : bookingDate
  const now = new Date()
  const cancellationDeadline = new Date(date)
  cancellationDeadline.setHours(cancellationDeadline.getHours() - hoursBefore)
  
  return now < cancellationDeadline
}

/**
 * Format booking date for display
 */
export function formatBookingDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Calculate duration in hours between two times
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  
  const start = startHours * 60 + startMinutes
  const end = endHours * 60 + endMinutes
  
  return (end - start) / 60
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d < today
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to a date
 */
export function addMonths(date: Date | string, months: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  const result = new Date(d)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Format time for display (12-hour, e.g. "2:00 PM")
 * Accepts HH:MM or HH:MM:SS.
 */
export function formatTime(time: string): string {
  const parts = time.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10) || 0
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get the next top-of-hour time (rounded up)
 * Example: 2:15 PM -> 3:00 PM, 2:00 PM -> 2:00 PM
 */
export function getNextTopOfHour(): Date {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setHours(now.getHours() + 1)
  nextHour.setMinutes(0, 0, 0)
  return nextHour
}

/**
 * Format time string to Date for comparison
 * Uses local date parsing to avoid UTC timezone shift issues
 */
export function timeStringToDate(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  // Parse date as local midnight to avoid UTC shift
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed
  date.setHours(hours, minutes || 0, 0, 0)
  return date
}



