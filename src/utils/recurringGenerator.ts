/**
 * Recurring booking generation utilities extracted from generate_recurring_bookings() trigger
 */

import type { Booking, RecurringType } from '@/types'
import { BUSINESS_RULES } from '@/types'
import { addDays, addMonths } from './dateHelpers'

export interface RecurringBookingInstance {
  date: string
  start_time: string
  end_time: string
  status: 'pending'
  total_amount: number
  insurance_approved: boolean
  insurance_required: boolean
}

/**
 * Calculate recurring dates for weekly pattern
 */
export function generateWeeklyRecurring(
  startDate: Date | string,
  endDate: Date | string
): Date[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const dates: Date[] = []
  let currentDate = new Date(start)
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 7) // Add 1 week
  }
  
  return dates
}

/**
 * Calculate recurring dates for monthly pattern
 */
export function generateMonthlyRecurring(
  startDate: Date | string,
  endDate: Date | string
): Date[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const dates: Date[] = []
  let currentDate = new Date(start)
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate))
    currentDate = addMonths(currentDate, 1) // Add 1 month
  }
  
  return dates
}

/**
 * Calculate end date based on recurring type
 */
export function calculateRecurringEndDate(
  startDate: Date | string,
  recurringType: RecurringType
): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  
  if (recurringType === 'weekly') {
    return addMonths(start, BUSINESS_RULES.RECURRING_WEEKLY_MAX_MONTHS)
  } else if (recurringType === 'monthly') {
    return addMonths(start, BUSINESS_RULES.RECURRING_MONTHLY_MAX_MONTHS)
  }
  
  return start
}

/**
 * Generate recurring booking instances from a parent booking
 */
export function calculateRecurringDates(
  parentBooking: Booking
): RecurringBookingInstance[] {
  if (parentBooking.recurring_type === 'none') {
    return []
  }
  
  const startDate = new Date(parentBooking.date)
  const endDate = parentBooking.recurring_end_date
    ? new Date(parentBooking.recurring_end_date)
    : calculateRecurringEndDate(startDate, parentBooking.recurring_type)
  
  let dates: Date[]
  
  if (parentBooking.recurring_type === 'weekly') {
    dates = generateWeeklyRecurring(startDate, endDate)
  } else if (parentBooking.recurring_type === 'monthly') {
    dates = generateMonthlyRecurring(startDate, endDate)
  } else {
    return []
  }
  
  // Filter out the original date (it's already in the main bookings table)
  const recurringDates = dates.filter(
    (date) => date.toISOString().split('T')[0] !== parentBooking.date
  )
  
  // Convert to recurring booking instances
  return recurringDates.map((date) => ({
    date: date.toISOString().split('T')[0],
    start_time: parentBooking.start_time,
    end_time: parentBooking.end_time,
    status: 'pending' as const,
    total_amount: parentBooking.total_amount,
    insurance_approved: parentBooking.insurance_approved,
    insurance_required: parentBooking.insurance_required,
  }))
}



