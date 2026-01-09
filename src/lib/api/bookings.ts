/**
 * Booking API Client
 * Typed methods for all booking-related API endpoints
 */

import { apiClient } from './client'
import type { Booking } from '@/types'
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  CancelBookingRequest,
  CheckConflictsRequest,
  CheckConflictsResponse,
  GenerateRecurringRequest,
  GenerateRecurringResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
} from '@/types/api'

/**
 * Booking API client methods
 */
export const bookingApi = {
  /**
   * List bookings with optional filters
   */
  async listBookings(
    params?: ListBookingsQueryParams
  ): Promise<ListBookingsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.status) queryParams.append('status', params.status)
    if (params?.venue_id) queryParams.append('venue_id', params.venue_id)
    if (params?.date_from) queryParams.append('date_from', params.date_from)
    if (params?.date_to) queryParams.append('date_to', params.date_to)
    if (params?.page) queryParams.append('page', params.page)
    if (params?.limit) queryParams.append('limit', params.limit)
    if (params?.role_view) queryParams.append('role_view', params.role_view)

    const queryString = queryParams.toString()
    const endpoint = `/bookings${queryString ? `?${queryString}` : ''}`

    const response = await apiClient.getPaginated<Booking>(endpoint)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response
  },

  /**
   * Get a single booking by ID
   */
  async getBooking(id: string): Promise<Booking> {
    const response = await apiClient.get<Booking>(`/bookings/${id}`)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingRequest): Promise<Booking> {
    const response = await apiClient.post<Booking>('/bookings', data)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Update an existing booking
   */
  async updateBooking(id: string, data: UpdateBookingRequest): Promise<Booking> {
    const response = await apiClient.patch<Booking>(`/bookings/${id}`, data)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    const response = await apiClient.post<Booking>(`/bookings/${id}/cancel`, {
      reason,
    } as CancelBookingRequest)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Confirm a booking (venue owner only)
   */
  async confirmBooking(id: string): Promise<Booking> {
    const response = await apiClient.post<Booking>(`/bookings/${id}/confirm`)
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Check for booking conflicts
   */
  async checkConflicts(data: CheckConflictsRequest): Promise<CheckConflictsResponse['data']> {
    const response = await apiClient.post<CheckConflictsResponse['data']>(
      '/bookings/conflicts',
      data
    )
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },

  /**
   * Generate recurring bookings
   */
  async generateRecurring(data: GenerateRecurringRequest): Promise<GenerateRecurringResponse['data']> {
    const response = await apiClient.post<GenerateRecurringResponse['data']>(
      '/bookings/recurring',
      data
    )
    
    if (!response.success) {
      throw new Error(response.error.message)
    }

    return response.data
  },
}


