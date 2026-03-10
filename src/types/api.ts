/**
 * API-specific type definitions
 */

import type { Booking, CancellationResult, RecurringBooking } from './index'
import type { DropInTemplateWindow, OperatingHourWindow } from './index'

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

export type CreateBookingResponse = ApiResponse<Booking>

export interface UpdateBookingRequest {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  recurring_type?: 'none' | 'weekly' | 'monthly'
  recurring_end_date?: string
}

export type UpdateBookingResponse = ApiResponse<Booking>

export interface CancelBookingRequest {
  reason?: string
}

export type CancelBookingResponse = ApiResponse<CancellationResult>

export type ConfirmBookingResponse = ApiResponse<Booking>

export interface CheckConflictsRequest {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  exclude_booking_id?: string
}

export type CheckConflictsResponse = ApiResponse<{
  hasConflict: boolean
  conflictType?: 'time_overlap' | 'slot_unavailable' | 'advance_booking_exceeded'
  conflictingBookingId?: string
  message?: string
}>

export interface GenerateRecurringRequest {
  parent_booking_id: string
  recurring_type: 'weekly' | 'monthly'
  end_date: string
}

export type GenerateRecurringResponse = ApiResponse<RecurringBooking[]>

export type GetBookingResponse = ApiResponse<Booking>

export interface ListBookingsQueryParams {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  venue_id?: string
  date_from?: string
  date_to?: string
  time_view?: 'upcoming' | 'past'
  page?: string
  limit?: string
  role_view?: 'renter' | 'host'
}

export type ListBookingsResponse = PaginatedResponse<Booking>

export interface AdminVenueBookingRenterSummary {
  first_name: string | null
  last_name: string | null
  email: string | null
}

export interface AdminVenueBookingFeedItem extends Booking {
  renter: AdminVenueBookingRenterSummary | null
}

/**
 * Venue availability API types
 */
export interface AvailableSlot {
  date: string
  start_time: string
  end_time: string
  venue_id: string
  availability_id?: string | null
  slot_instance_id?: string | null
  action_type: 'instant_book' | 'request_private' | 'info_only_open_gym'
  modal_content?: {
    title: string
    body: string
    bullet_points?: string[]
    cta_label?: string | null
  } | null
  slot_pricing?: {
    amount_cents: number
    currency: string
    unit: 'hour' | 'person' | 'session'
    payment_method: 'in_app' | 'on_site'
  } | null
}

export interface GetAvailabilityParams {
  date_from: string
  date_to: string
}

export type GetAvailabilityResponse = ApiResponse<AvailableSlot[]>

export type AdminVenueAvailabilityPreviewReason =
  | 'closed'
  | 'blackout'
  | 'holiday'
  | 'advance_notice'
  | 'google_blocked'
  | 'fully_booked'

export interface AdminVenueAvailabilityPreviewWindow {
  start_time: string
  end_time: string
}

export interface AdminVenueAvailabilityPreviewDay {
  date: string
  private_booking: AdminVenueAvailabilityPreviewWindow[]
  drop_in: AdminVenueAvailabilityPreviewWindow[]
  reason_chips: AdminVenueAvailabilityPreviewReason[]
}

export interface AdminVenueAvailabilityPreviewRequest {
  operating_hours: OperatingHourWindow[]
  drop_in_enabled: boolean
  drop_in_templates: DropInTemplateWindow[]
  min_advance_booking_days: number
  min_advance_lead_time_hours: number
  blackout_dates: string[]
  holiday_dates: string[]
}

export type AdminVenueAvailabilityPreviewResponse = ApiResponse<{
  days: string[]
  live_preview: AdminVenueAvailabilityPreviewDay[]
  draft_preview: AdminVenueAvailabilityPreviewDay[]
  changed_day_count: number
  has_unpublished_changes: boolean
}>
