/**
 * Capture Payment API Route
 * POST /api/payments/capture - Capture payment for an authorized booking
 * Called after owner approval or insurance approval to charge the saved card
 */

import { NextRequest } from 'next/server'
import { PaymentService } from '@/services/paymentService'
import { requireAuth } from '@/middleware/authMiddleware'
import { handleApiError } from '@/utils/errorHandling'
import type { ApiResponse } from '@/types/api'
import { createClient } from '@/lib/supabase/server'

interface CapturePaymentRequest {
  booking_id: string
}

interface CapturePaymentResponse {
  payment_id: string
  payment_intent_id: string
  amount: number
  status: 'paid' | 'failed'
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    const body: CapturePaymentRequest = await request.json()

    if (!body.booking_id) {
      return Response.json(
        { success: false, message: 'booking_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify user is venue owner or admin (only they can trigger capture)
    const { data: booking } = await supabase
      .from('bookings')
      .select('venue_id')
      .eq('id', body.booking_id)
      .single()

    if (!booking) {
      return Response.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      )
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('owner_id')
      .eq('id', booking.venue_id)
      .single()

    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', auth.userId)
      .single()

    if (venue?.owner_id !== auth.userId && !user?.is_admin) {
      return Response.json(
        { success: false, message: 'Only venue owner or admin can capture payment' },
        { status: 403 }
      )
    }

    const paymentService = new PaymentService()
    const result = await paymentService.capturePayment(
      body.booking_id,
      auth.userId
    )

    const response: ApiResponse<CapturePaymentResponse> = {
      success: true,
      data: {
        payment_id: result.paymentId,
        payment_intent_id: result.paymentIntentId,
        amount: result.amount,
        status: result.status,
      },
      message: result.status === 'paid' 
        ? 'Payment captured successfully' 
        : 'Payment capture failed',
    }

    return Response.json(response, { 
      status: result.status === 'paid' ? 200 : 400 
    })
  } catch (error) {
    return handleApiError(error)
  }
}
