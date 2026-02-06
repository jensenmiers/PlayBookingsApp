/**
 * Payment Intent API Route
 * POST /api/payments/create-intent - Create Stripe PaymentIntent for embedded payment flow
 */

import { NextRequest } from 'next/server'
import { PaymentService } from '@/services/paymentService'
import { requireAuth } from '@/middleware/authMiddleware'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

interface CreateIntentRequest {
  booking_id: string
}

interface CreateIntentResponse {
  client_secret: string
  payment_id: string
  amount: number
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body: CreateIntentRequest = await request.json()

    if (!body.booking_id) {
      return Response.json(
        { success: false, message: 'booking_id is required' },
        { status: 400 }
      )
    }

    const paymentService = new PaymentService()
    const result = await paymentService.createPaymentIntent(
      body.booking_id,
      auth.userId
    )

    const response: ApiResponse<CreateIntentResponse> = {
      success: true,
      data: {
        client_secret: result.clientSecret,
        payment_id: result.paymentId,
        amount: result.amount,
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
