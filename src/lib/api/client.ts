/**
 * Base API Client
 * Provides type-safe fetch wrapper with authentication and error handling
 */

import { createClient } from '@/lib/supabase/client'
import type { ApiResponse, ErrorResponse, PaginatedResponse } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

/**
 * API Client configuration
 */
interface ApiClientConfig {
  baseUrl?: string
  headers?: Record<string, string>
}

/**
 * Request options extending fetch options
 */
interface RequestOptions extends RequestInit {
  requireAuth?: boolean
}

/**
 * Base API client class
 */
class ApiClient {
  private baseUrl: string

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || API_BASE_URL
  }

  /**
   * Get authentication token from Supabase session
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  /**
   * Build request headers with authentication
   */
  private async buildHeaders(
    customHeaders?: Record<string, string>,
    requireAuth = true
  ): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    if (requireAuth) {
      const token = await this.getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<ErrorResponse> {
    let errorData: unknown
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: response.statusText || 'Unknown error' }
    }

    const errorResponse = errorData as ErrorResponse
    return {
      success: false,
      error: {
        message: errorResponse.error?.message || 'An error occurred',
        code: errorResponse.error?.code,
        statusCode: response.status,
        details: errorResponse.error?.details,
      },
    }
  }

  /**
   * Make a typed API request
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T> | ErrorResponse> {
    const { requireAuth = true, headers: customHeaders, ...fetchOptions } = options

    try {
      const url = `${this.baseUrl}${endpoint}`
      const headers = await this.buildHeaders(customHeaders, requireAuth)

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      })

      if (!response.ok) {
        return await this.parseErrorResponse(response)
      }

      const data = await response.json()
      return data as ApiResponse<T>
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      return {
        success: false,
        error: {
          message: errorMessage,
          statusCode: 0,
        },
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T> | ErrorResponse> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T> | ErrorResponse> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T> | ErrorResponse> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T> | ErrorResponse> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    })
  }

  /**
   * GET request with pagination
   */
  async getPaginated<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<PaginatedResponse<T> | ErrorResponse> {
    const response = await this.get<PaginatedResponse<T>['data']>(endpoint, options)
    
    if (!response.success) {
      return response as ErrorResponse
    }

    // If the response doesn't have pagination, wrap it
    if ('pagination' in response) {
      return response as PaginatedResponse<T>
    }

    // Fallback: wrap single response in paginated format
    return {
      success: true,
      data: Array.isArray(response.data) ? response.data : [response.data],
      pagination: {
        page: 1,
        limit: response.data.length,
        total: Array.isArray(response.data) ? response.data.length : 1,
        total_pages: 1,
      },
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for custom instances if needed
export { ApiClient }

