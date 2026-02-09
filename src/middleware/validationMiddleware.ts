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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/97bc146d-eee9-4dbd-a863-843c469f9d99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'validationMiddleware.ts:validateRequest',message:'Raw request body received',data:{body,url:request.url},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H5'})}).catch(()=>{});
    // #endregion
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97bc146d-eee9-4dbd-a863-843c469f9d99',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'validationMiddleware.ts:validateRequest:zodError',message:'Zod validation failed',data:{details,issueCount:error.issues.length,issues:error.issues},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H4'})}).catch(()=>{});
      // #endregion
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
      const details = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      throw badRequest('Invalid query parameters', details)
    }
    throw badRequest('Invalid query parameters')
  }
}



