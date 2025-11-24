/**
 * API-specific type definitions
 */

import type { Booking, RecurringBooking } from './index'

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: true
  data: T
  message?: string
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    statusCode: number
    details?: unknown
  }
}

/**
 * Booking API request/response types
 */
export interface CreateBookingRequest {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  recurring_type?: 'none' | 'weekly' | 'monthly'
  recurring_end_date?: string
  notes?: string
}

export interface CreateBookingResponse extends ApiResponse<Booking> {}

export interface UpdateBookingRequest {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  recurring_type?: 'none' | 'weekly' | 'monthly'
  recurring_end_date?: string
}

export interface UpdateBookingResponse extends ApiResponse<Booking> {}

export interface CancelBookingRequest {
  reason?: string
}

export interface CancelBookingResponse extends ApiResponse<Booking> {}

export interface ConfirmBookingResponse extends ApiResponse<Booking> {}

export interface CheckConflictsRequest {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  exclude_booking_id?: string
}

export interface CheckConflictsResponse extends ApiResponse<{
  hasConflict: boolean
  conflictType?: 'time_overlap' | 'availability_unavailable' | 'advance_booking_exceeded'
  conflictingBookingId?: string
  message?: string
}> {}

export interface GenerateRecurringRequest {
  parent_booking_id: string
  recurring_type: 'weekly' | 'monthly'
  end_date: string
}

export interface GenerateRecurringResponse extends ApiResponse<RecurringBooking[]> {}

export interface GetBookingResponse extends ApiResponse<Booking> {}

export interface ListBookingsQueryParams {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  venue_id?: string
  date_from?: string
  date_to?: string
  page?: string
  limit?: string
}

export interface ListBookingsResponse extends PaginatedResponse<Booking> {}



