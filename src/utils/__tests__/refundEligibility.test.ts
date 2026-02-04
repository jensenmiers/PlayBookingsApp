/**
 * Unit tests for refund eligibility (getCancellationInfo)
 * 
 * These tests use Date objects directly to avoid timezone parsing issues
 */

import { getCancellationInfo, isWithinCancellationWindow } from '../dateHelpers'

describe('getCancellationInfo', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('eligibleForRefund', () => {
    it('should be eligible for refund when 72 hours before booking (using Date object)', () => {
      const now = new Date()
      jest.setSystemTime(now)

      // Use Date object directly to avoid string parsing issues
      const bookingDateTime = new Date(now.getTime() + 72 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.eligibleForRefund).toBe(true)
      expect(result.canCancel).toBe(true)
    })

    it('should be eligible for refund when 49 hours before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 49 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.eligibleForRefund).toBe(true)
    })

    it('should NOT be eligible for refund when 24 hours before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.eligibleForRefund).toBe(false)
      expect(result.canCancel).toBe(true) // Can still cancel, just no refund
    })

    it('should NOT be eligible for refund when exactly 48 hours before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      // Exactly 48 hours - at the boundary
      const bookingDateTime = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      // At exactly 48 hours, now >= deadline, so not eligible
      expect(result.eligibleForRefund).toBe(false)
    })

    it('should NOT be eligible for refund when 47 hours before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 47 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.eligibleForRefund).toBe(false)
    })

    it('should be eligible when 48 hours and 1 second before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      // Just over 48 hours
      const bookingDateTime = new Date(now.getTime() + (48 * 60 * 60 * 1000) + 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.eligibleForRefund).toBe(true)
    })
  })

  describe('canCancel', () => {
    it('should allow cancellation when booking is in the future', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.canCancel).toBe(true)
    })

    it('should NOT allow cancellation when booking has started', () => {
      const now = new Date()
      jest.setSystemTime(now)

      // Booking started 1 hour ago
      const bookingDateTime = new Date(now.getTime() - 1 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.canCancel).toBe(false)
    })

    it('should allow cancellation when booking is 1 minute in the future', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.canCancel).toBe(true)
    })
  })

  describe('hoursUntilBooking', () => {
    it('should calculate correct hours until booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 72 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.hoursUntilBooking).toBeCloseTo(72, 1)
    })

    it('should return negative hours for past bookings', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      expect(result.hoursUntilBooking).toBeCloseTo(-2, 1)
    })
  })

  describe('refundDeadline', () => {
    it('should calculate refund deadline as 48 hours before booking', () => {
      const now = new Date()
      jest.setSystemTime(now)

      const bookingDateTime = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const result = getCancellationInfo(bookingDateTime)

      const expectedDeadline = new Date(bookingDateTime.getTime() - 48 * 60 * 60 * 1000)
      
      expect(result.refundDeadline.getTime()).toBe(expectedDeadline.getTime())
    })
  })
})

describe('isWithinCancellationWindow', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return true when 72 hours before booking (within 48-hour window)', () => {
    const now = new Date()
    jest.setSystemTime(now)

    const bookingDate = new Date(now.getTime() + 72 * 60 * 60 * 1000)

    const result = isWithinCancellationWindow(bookingDate)

    expect(result).toBe(true)
  })

  it('should return false when 24 hours before booking (outside 48-hour window)', () => {
    const now = new Date()
    jest.setSystemTime(now)

    const bookingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const result = isWithinCancellationWindow(bookingDate)

    expect(result).toBe(false)
  })

  it('should support custom hours before parameter', () => {
    const now = new Date()
    jest.setSystemTime(now)

    // 30 hours from now with 24-hour window
    const bookingDate = new Date(now.getTime() + 30 * 60 * 60 * 1000)

    const result = isWithinCancellationWindow(bookingDate, 24)

    expect(result).toBe(true)
  })
})
