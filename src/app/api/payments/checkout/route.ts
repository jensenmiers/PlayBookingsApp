/**
 * Payment Checkout API Route
 * POST /api/payments/checkout - Create Stripe Checkout session for a booking
 */

import { NextRequest } from 'next/server'
import { PaymentService } from '@/services/paymentService'
import { requireAuth } from '@/middleware/authMiddleware'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

interface CheckoutRequest {
  booking_id: string
}

interface CheckoutResponse {
  url: string
  session_id: string
  payment_id: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body: CheckoutRequest = await request.json()

    if (!body.booking_id) {
      return Response.json(
        { success: false, message: 'booking_id is required' },
        { status: 400 }
      )
    }

    // Get base URL for success/cancel redirects
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const paymentService = new PaymentService()
    const result = await paymentService.createCheckoutSession(
      body.booking_id,
      auth.userId,
      baseUrl
    )

    const response: ApiResponse<CheckoutResponse> = {
      success: true,
      data: {
        url: result.url,
        session_id: result.sessionId,
        payment_id: result.paymentId,
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
