/**
 * Date manipulation utilities for booking system
 */

import { BUSINESS_RULES } from '@/types'

/**
 * Check if a booking date is within the advance booking window
 */
export function isWithinAdvanceWindow(
  date: Date | string,
  maxAdvanceDays: number = BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS
): boolean {
  const bookingDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays)
  
  bookingDate.setHours(0, 0, 0, 0)
  
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
 * Format time for display (HH:MM)
 */
export function formatTime(time: string): string {
  return time.substring(0, 5) // Ensure HH:MM format
}



