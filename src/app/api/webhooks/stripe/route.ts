/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 */

import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PaymentService } from '@/services/paymentService'
import { BookingConfirmationEmailDataError } from '@/services/bookingConfirmationEmailService'
import type Stripe from 'stripe'
import { getPostHogClient } from '@/lib/posthog-server'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Analytics must never fail the webhook: a non-2xx response makes Stripe
// retry an event whose payment work has already completed.
async function captureWebhookEvent(
  event: Parameters<ReturnType<typeof getPostHogClient>['capture']>[0]
): Promise<void> {
  try {
    const posthog = getPostHogClient()
    posthog.capture(event)
    await posthog.flush()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to capture webhook analytics (${event.event}): ${message}`)
  }
}

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

          await captureWebhookEvent({
            distinctId: session.client_reference_id ?? session.id,
            event: 'payment_succeeded',
            properties: {
              session_id: session.id,
              payment_intent_id: session.payment_intent,
              amount_total: session.amount_total,
              currency: session.currency,
            },
          })
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session expired: ${session.id}`)
        // Payment stays pending, no action needed
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Processing payment_intent.succeeded: ${paymentIntent.id}`)
        await paymentService.processPaymentSuccess(paymentIntent.id)
        console.log(`Payment processed successfully for intent ${paymentIntent.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`Payment failed for intent: ${paymentIntent.id}`)
        // Payment stays pending, slot remains held per spec

        await captureWebhookEvent({
          distinctId: paymentIntent.id,
          event: 'payment_failed',
          properties: {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            failure_code: paymentIntent.last_payment_error?.code,
          },
        })
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

    if (error instanceof BookingConfirmationEmailDataError) {
      // Missing booking/renter/venue data cannot be repaired by Stripe retry.
      // Acknowledge the event and retain a clear operational log.
      console.error(`Non-retryable webhook processing error: ${message}`)
      return Response.json({
        received: true,
        error: 'Webhook processing permanently failed',
      })
    }

    console.error(`Error processing webhook: ${message}`)
    // Successful-payment work is idempotent. A non-2xx response lets Stripe
    // retry transient database and confirmation-email failures.
    return Response.json(
      { received: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
