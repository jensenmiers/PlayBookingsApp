/**
 * Setup Intent API Route
 * POST /api/payments/create-setup-intent - Create Stripe SetupIntent for deferred payment
 * Used when payment is collected upfront but charged later (after approval)
 */

import { NextRequest } from 'next/server'
import { PaymentService } from '@/services/paymentService'
import { requireAuth } from '@/middleware/authMiddleware'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'

interface CreateSetupIntentRequest {
  booking_id: string
}

interface CreateSetupIntentResponse {
  client_secret: string
  payment_id: string
  amount: number
  setup_intent_id: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body: CreateSetupIntentRequest = await request.json()

    if (!body.booking_id) {
      return Response.json(
        { success: false, message: 'booking_id is required' },
        { status: 400 }
      )
    }

    const paymentService = new PaymentService()
    const result = await paymentService.createSetupIntent(
      body.booking_id,
      auth.userId
    )

    const response: ApiResponse<CreateSetupIntentResponse> = {
      success: true,
      data: {
        client_secret: result.clientSecret,
        payment_id: result.paymentId,
        amount: result.amount,
        setup_intent_id: result.setupIntentId,
      },
    }

    return Response.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
