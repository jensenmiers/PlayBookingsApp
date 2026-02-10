/**
 * Unit tests for slot splitting utilities
 * Tests the bug fix for minutesToTime() returning HH:MM:SS format
 */

import {
  timeToMinutes,
  minutesToTime,
  roundUpToGranularity,
  roundDownToGranularity,
  computeAvailableSlotsForAvailability,
} from '../slotSplitting'
import type { Availability, Booking, RecurringBooking } from '@/types'

describe('slotSplitting utilities', () => {
  describe('timeToMinutes', () => {
    it('parses HH:MM format correctly', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('09:00')).toBe(540)
      expect(timeToMinutes('13:30')).toBe(810)
      expect(timeToMinutes('19:00')).toBe(1140)
      expect(timeToMinutes('23:59')).toBe(1439)
    })

    it('parses HH:MM:SS format correctly', () => {
      expect(timeToMinutes('00:00:00')).toBe(0)
      expect(timeToMinutes('09:00:00')).toBe(540)
      expect(timeToMinutes('13:30:00')).toBe(810)
      expect(timeToMinutes('19:00:00')).toBe(1140)
      expect(timeToMinutes('23:59:59')).toBe(1439)
    })

    it('handles edge cases', () => {
      expect(timeToMinutes('12:00')).toBe(720) // noon
      expect(timeToMinutes('00:30')).toBe(30)  // 12:30 AM
    })
  })

  describe('minutesToTime', () => {
    it('returns midnight as 00:00:00', () => {
      expect(minutesToTime(0)).toBe('00:00:00')
    })

    it('returns 9 AM as 09:00:00', () => {
      expect(minutesToTime(540)).toBe('09:00:00')
    })

    it('returns 7 PM as 19:00:00', () => {
      expect(minutesToTime(1140)).toBe('19:00:00')
    })

    it('returns 1:30 PM as 13:30:00', () => {
      expect(minutesToTime(810)).toBe('13:30:00')
    })

    it('always returns HH:MM:SS format matching regex', () => {
      const regex = /^\d{2}:\d{2}:\d{2}$/
      
      // Test a variety of times
      const testMinutes = [0, 30, 60, 90, 540, 720, 810, 1140, 1439]
      for (const mins of testMinutes) {
        const result = minutesToTime(mins)
        expect(result).toMatch(regex)
      }
    })

    it('pads single-digit hours with leading zero', () => {
      expect(minutesToTime(60)).toBe('01:00:00')
      expect(minutesToTime(120)).toBe('02:00:00')
      expect(minutesToTime(540)).toBe('09:00:00')
    })

    it('pads single-digit minutes with leading zero', () => {
      expect(minutesToTime(5)).toBe('00:05:00')
      expect(minutesToTime(65)).toBe('01:05:00')
    })
  })

  describe('roundUpToGranularity', () => {
    it('rounds up to 30-minute boundaries', () => {
      expect(roundUpToGranularity(0)).toBe(0)
      expect(roundUpToGranularity(1)).toBe(30)
      expect(roundUpToGranularity(29)).toBe(30)
      expect(roundUpToGranularity(30)).toBe(30)
      expect(roundUpToGranularity(31)).toBe(60)
      expect(roundUpToGranularity(45)).toBe(60)
    })
  })

  describe('roundDownToGranularity', () => {
    it('rounds down to 30-minute boundaries', () => {
      expect(roundDownToGranularity(0)).toBe(0)
      expect(roundDownToGranularity(29)).toBe(0)
      expect(roundDownToGranularity(30)).toBe(30)
      expect(roundDownToGranularity(59)).toBe(30)
      expect(roundDownToGranularity(60)).toBe(60)
    })
  })

  describe('computeAvailableSlotsForAvailability', () => {
    const createAvailability = (overrides: Partial<Availability> = {}): Availability => ({
      id: 'avail-123',
      venue_id: 'venue-123',
      date: '2026-02-10',
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: true,
      created_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
      id: 'booking-123',
      venue_id: 'venue-123',
      renter_id: 'user-123',
      date: '2026-02-10',
      start_time: '10:00:00',
      end_time: '11:00:00',
      status: 'confirmed',
      total_amount: 100,
      insurance_approved: false,
      insurance_required: false,
      recurring_type: 'none',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('returns slots with HH:MM:SS format', () => {
      const availability = createAvailability()
      const slots = computeAvailableSlotsForAvailability(availability, [], [])

      expect(slots.length).toBeGreaterThan(0)
      
      const regex = /^\d{2}:\d{2}:\d{2}$/
      for (const slot of slots) {
        expect(slot.start_time).toMatch(regex)
        expect(slot.end_time).toMatch(regex)
      }
    })

    it('returns full availability when no bookings exist', () => {
      const availability = createAvailability({
        start_time: '09:00:00',
        end_time: '17:00:00',
      })
      
      const slots = computeAvailableSlotsForAvailability(availability, [], [])
      
      expect(slots).toHaveLength(1)
      expect(slots[0].start_time).toBe('09:00:00')
      expect(slots[0].end_time).toBe('17:00:00')
    })

    it('subtracts confirmed bookings from availability', () => {
      const availability = createAvailability({
        start_time: '09:00:00',
        end_time: '17:00:00',
      })
      
      const booking = createBooking({
        start_time: '12:00:00',
        end_time: '13:00:00',
        status: 'confirmed',
      })
      
      const slots = computeAvailableSlotsForAvailability(availability, [booking], [])
      
      expect(slots).toHaveLength(2)
      expect(slots[0].start_time).toBe('09:00:00')
      expect(slots[0].end_time).toBe('12:00:00')
      expect(slots[1].start_time).toBe('13:00:00')
      expect(slots[1].end_time).toBe('17:00:00')
    })

    it('subtracts pending bookings from availability', () => {
      const availability = createAvailability()
      const booking = createBooking({
        start_time: '09:00:00',
        end_time: '11:00:00',
        status: 'pending',
      })
      
      const slots = computeAvailableSlotsForAvailability(availability, [booking], [])
      
      expect(slots[0].start_time).toBe('11:00:00')
    })

    it('ignores cancelled bookings', () => {
      const availability = createAvailability({
        start_time: '09:00:00',
        end_time: '11:00:00',
      })
      
      const booking = createBooking({
        start_time: '09:00:00',
        end_time: '10:00:00',
        status: 'cancelled',
      })
      
      const slots = computeAvailableSlotsForAvailability(availability, [booking], [])
      
      // Full availability should remain since booking is cancelled
      expect(slots).toHaveLength(1)
      expect(slots[0].start_time).toBe('09:00:00')
      expect(slots[0].end_time).toBe('11:00:00')
    })

    it('filters out slots shorter than minimum duration (60 minutes)', () => {
      const availability = createAvailability({
        start_time: '09:00:00',
        end_time: '10:30:00', // 90 minutes total
      })
      
      const booking = createBooking({
        start_time: '09:00:00',
        end_time: '10:00:00', // leaves only 30 minutes
      })
      
      const slots = computeAvailableSlotsForAvailability(availability, [booking], [])
      
      // Should filter out the 30-minute slot
      expect(slots).toHaveLength(0)
    })

    it('includes recurring bookings in subtraction', () => {
      const availability = createAvailability({
        start_time: '09:00:00',
        end_time: '17:00:00',
      })
      
      const recurringBooking: RecurringBooking = {
        id: 'recurring-123',
        parent_booking_id: 'parent-123',
        venue_id: 'venue-123',
        renter_id: 'user-123',
        date: '2026-02-10',
        start_time: '14:00:00',
        end_time: '15:00:00',
        status: 'confirmed',
        total_amount: 100,
        insurance_approved: false,
        created_at: '2024-01-01T00:00:00Z',
      }
      
      const slots = computeAvailableSlotsForAvailability(availability, [], [recurringBooking])
      
      expect(slots).toHaveLength(2)
      expect(slots[0].end_time).toBe('14:00:00')
      expect(slots[1].start_time).toBe('15:00:00')
    })
  })
})
