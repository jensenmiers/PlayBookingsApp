/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 */

import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PaymentService } from '@/services/paymentService'
import type Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return Response.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return Response.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  const paymentService = new PaymentService()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Processing checkout.session.completed: ${session.id}`)

        if (session.payment_intent && session.payment_status === 'paid') {
          await paymentService.processPaymentSuccess(
            session.payment_intent as string,
            session.id
          )
          console.log(`Payment processed successfully for session ${session.id}`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session expired: ${session.id}`)
        // Payment stays pending, no action needed
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment failed for intent: ${paymentIntent.id}`)
        // Payment stays pending, slot remains held per spec
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log(`Processing charge.refunded: ${charge.id}`)

        if (charge.payment_intent) {
          const refundAmount = charge.amount_refunded
          await paymentService.processRefundWebhook(
            charge.payment_intent as string,
            refundAmount
          )
          console.log(`Refund processed for charge ${charge.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return Response.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error processing webhook: ${message}`)
    // Return 200 to prevent Stripe from retrying (we've logged the error)
    // In production, you might want to return 500 for certain recoverable errors
    return Response.json({ received: true, error: message })
  }
}

// Stripe webhooks must bypass the default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
}
