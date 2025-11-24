/**
 * Request validation middleware using Zod schemas
 */

import { z } from 'zod'
import { badRequest } from '@/utils/errorHandling'
import type { NextRequest } from 'next/server'

/**
 * Validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw badRequest('Validation failed', details)
    }
    throw badRequest('Invalid request body')
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): T {
  try {
    const url = new URL(request.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      params[key] = value
    })
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw badRequest('Invalid query parameters', details)
    }
    throw badRequest('Invalid query parameters')
  }
}



