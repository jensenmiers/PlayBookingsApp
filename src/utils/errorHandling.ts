/**
 * Standardized error handling for API responses
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export interface ErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    statusCode: number
    details?: unknown
  }
}

export function createErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      },
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message,
        statusCode: 500,
      },
    }
  }

  return {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  }
}

export function handleApiError(error: unknown): Response {
  const errorResponse = createErrorResponse(error)
  const statusCode = errorResponse.error.statusCode

  return Response.json(errorResponse, { status: statusCode })
}

// Common error creators
export function notFound(message = 'Resource not found'): ApiError {
  return new ApiError(404, message, 'NOT_FOUND')
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, message, 'UNAUTHORIZED')
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(403, message, 'FORBIDDEN')
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, message, 'BAD_REQUEST', details)
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, message, 'CONFLICT', details)
}

export function internalError(message = 'Internal server error', details?: unknown): ApiError {
  return new ApiError(500, message, 'INTERNAL_ERROR', details)
}


