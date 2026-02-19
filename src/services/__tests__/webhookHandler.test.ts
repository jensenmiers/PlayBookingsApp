/**
 * Unit tests for Stripe webhook handler
 * Tests the payment_intent.succeeded event handling
 *
 * Uses dynamic require() to control when the route module loads,
 * since it captures STRIPE_WEBHOOK_SECRET at module scope.
 */

// Polyfill Response.json for jsdom test environment
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    body: string
    status: number
    headers: Record<string, string>

    constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body || ''
      this.status = init?.status || 200
      this.headers = init?.headers || {}
    }

    async json() {
      return JSON.parse(this.body)
    }

    static json(data: unknown, init?: { status?: number }) {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: { 'content-type': 'application/json' },
      })
    }
  } as unknown as typeof globalThis.Response
}

// Mock PaymentService
const mockProcessPaymentSuccess = jest.fn()
const mockProcessRefundWebhook = jest.fn()

jest.mock('@/services/paymentService', () => ({
  PaymentService: jest.fn().mockImplementation(() => ({
    processPaymentSuccess: mockProcessPaymentSuccess,
    processRefundWebhook: mockProcessRefundWebhook,
  })),
}))

// Mock stripe
const mockConstructEvent = jest.fn()
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}))

jest.mock('@/repositories/paymentRepository')
jest.mock('@/repositories/bookingRepository')
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
}))

describe('Stripe Webhook Handler', () => {
  let POST: (request: unknown) => Promise<{ status: number; json: () => Promise<unknown> }>

  beforeAll(async () => {
    // Set env var BEFORE importing the route module
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    // Dynamic import so webhookSecret captures the env var
    const route = await import('@/app/api/webhooks/stripe/route')
    POST = route.POST as unknown as (request: unknown) => Promise<{ status: number; json: () => Promise<unknown> }>
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(body: string, headers: Record<string, string> = {}) {
    const headerMap = new Map(Object.entries(headers))
    return {
      text: jest.fn().mockResolvedValue(body),
      headers: {
        get: (name: string) => headerMap.get(name) || null,
      },
    }
  }

  it('should return 400 when stripe-signature header is missing', async () => {
    const request = createRequest('{}')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Missing stripe-signature header' })
  })

  it('should return 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const request = createRequest('{}', { 'stripe-signature': 'bad_sig' })

    const response = await POST(request)
    const data = await response.json() as { error: string }

    expect(response.status).toBe(400)
    expect(data.error).toContain('Webhook signature verification failed')
  })

  it('should handle payment_intent.succeeded and call processPaymentSuccess with only paymentIntentId', async () => {
    const fakeEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_embedded_123',
          metadata: { booking_id: 'booking-123' },
        },
      },
    }

    mockConstructEvent.mockReturnValue(fakeEvent)
    mockProcessPaymentSuccess.mockResolvedValue({
      payment: { id: 'payment-123' },
      booking: { id: 'booking-123' },
    })

    const request = createRequest('{}', { 'stripe-signature': 'valid_sig' })
    const response = await POST(request)
    const data = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockProcessPaymentSuccess).toHaveBeenCalledWith('pi_embedded_123')
    // Should NOT pass a second argument (no checkoutSessionId)
    expect(mockProcessPaymentSuccess).toHaveBeenCalledTimes(1)
    expect(mockProcessPaymentSuccess.mock.calls[0].length).toBe(1)
  })

  it('should handle checkout.session.completed and pass both paymentIntentId and sessionId', async () => {
    const fakeEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_session_456',
          payment_intent: 'pi_checkout_456',
          payment_status: 'paid',
        },
      },
    }

    mockConstructEvent.mockReturnValue(fakeEvent)
    mockProcessPaymentSuccess.mockResolvedValue({
      payment: { id: 'payment-123' },
      booking: { id: 'booking-123' },
    })

    const request = createRequest('{}', { 'stripe-signature': 'valid_sig' })
    const response = await POST(request)
    const data = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockProcessPaymentSuccess).toHaveBeenCalledWith('pi_checkout_456', 'cs_session_456')
  })

  it('should handle charge.refunded event', async () => {
    const fakeEvent = {
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_123',
          payment_intent: 'pi_test_123',
          amount_refunded: 10000,
        },
      },
    }

    mockConstructEvent.mockReturnValue(fakeEvent)
    mockProcessRefundWebhook.mockResolvedValue({ id: 'payment-123' })

    const request = createRequest('{}', { 'stripe-signature': 'valid_sig' })
    const response = await POST(request)
    const data = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockProcessRefundWebhook).toHaveBeenCalledWith('pi_test_123', 10000)
  })

  it('should return { received: true } for unhandled event types', async () => {
    const fakeEvent = {
      type: 'customer.created',
      data: { object: {} },
    }

    mockConstructEvent.mockReturnValue(fakeEvent)

    const request = createRequest('{}', { 'stripe-signature': 'valid_sig' })
    const response = await POST(request)
    const data = await response.json() as { received: boolean }

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
  })
})
