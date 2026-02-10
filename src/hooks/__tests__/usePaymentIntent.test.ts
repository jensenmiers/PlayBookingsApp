/**
 * Unit tests for payment intent hooks
 * Tests useCreateSetupIntent and useDeleteUnpaidBooking hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCreateSetupIntent, useDeleteUnpaidBooking, useCreatePaymentIntent } from '../usePaymentIntent'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to create mock Response objects (since Response is not available in jsdom)
function createMockResponse(body: unknown, options: { status?: number } = {}) {
  return {
    ok: (options.status ?? 200) >= 200 && (options.status ?? 200) < 300,
    status: options.status ?? 200,
    json: () => Promise.resolve(body),
  } as Response
}

describe('useCreateSetupIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useCreateSetupIntent())

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should set loading true during request', async () => {
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValue(pendingPromise)

    const { result } = renderHook(() => useCreateSetupIntent())

    act(() => {
      result.current.createSetupIntent('booking-123')
    })

    expect(result.current.loading).toBe(true)

    // Resolve to cleanup
    act(() => {
      resolvePromise!(createMockResponse({
        data: {
          client_secret: 'seti_secret',
          payment_id: 'payment-123',
          amount: 100,
          setup_intent_id: 'seti_123',
        },
      }, { status: 200 }))
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should return data on successful response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'seti_secret_abc',
        payment_id: 'payment-456',
        amount: 250,
        setup_intent_id: 'seti_789',
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreateSetupIntent())

    let response: { data: unknown; error: string | null }
    await act(async () => {
      response = await result.current.createSetupIntent('booking-123')
    })

    expect(response!.data).toEqual({
      clientSecret: 'seti_secret_abc',
      paymentId: 'payment-456',
      amount: 250,
      setupIntentId: 'seti_789',
    })
    expect(response!.error).toBeNull()
    expect(result.current.data).toEqual({
      clientSecret: 'seti_secret_abc',
      paymentId: 'payment-456',
      amount: 250,
      setupIntentId: 'seti_789',
    })
    expect(result.current.error).toBeNull()
  })

  it('should return error on failed response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      message: 'Booking not found',
    }, { status: 404 }))

    const { result } = renderHook(() => useCreateSetupIntent())

    let response: { data: unknown; error: string | null }
    await act(async () => {
      response = await result.current.createSetupIntent('nonexistent')
    })

    expect(response!.data).toBeNull()
    expect(response!.error).toBe('Booking not found')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Booking not found')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCreateSetupIntent())

    let response: { data: unknown; error: string | null }
    await act(async () => {
      response = await result.current.createSetupIntent('booking-123')
    })

    expect(response!.data).toBeNull()
    expect(response!.error).toBe('Network error')
    expect(result.current.error).toBe('Network error')
  })

  it('should call correct endpoint', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'secret',
        payment_id: 'pay',
        amount: 100,
        setup_intent_id: 'seti',
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreateSetupIntent())

    await act(async () => {
      await result.current.createSetupIntent('booking-xyz')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/payments/create-setup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: 'booking-xyz' }),
    })
  })

  it('should reset state when reset is called', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'secret',
        payment_id: 'pay',
        amount: 100,
        setup_intent_id: 'seti',
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreateSetupIntent())

    await act(async () => {
      await result.current.createSetupIntent('booking-123')
    })

    expect(result.current.data).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})

describe('useDeleteUnpaidBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useDeleteUnpaidBooking())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should call correct endpoint with hard=true query param', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      success: true,
    }, { status: 200 }))

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    await act(async () => {
      await result.current.deleteBooking('booking-123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/bookings/booking-123?hard=true', {
      method: 'DELETE',
    })
  })

  it('should return success true on 200 response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      success: true,
    }, { status: 200 }))

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    let response: { success: boolean; error: string | null }
    await act(async () => {
      response = await result.current.deleteBooking('booking-123')
    })

    expect(response!.success).toBe(true)
    expect(response!.error).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return error message on failure', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      message: 'Only pending bookings can be deleted',
    }, { status: 400 }))

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    let response: { success: boolean; error: string | null }
    await act(async () => {
      response = await result.current.deleteBooking('booking-123')
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Only pending bookings can be deleted')
    expect(result.current.error).toBe('Only pending bookings can be deleted')
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'))

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    let response: { success: boolean; error: string | null }
    await act(async () => {
      response = await result.current.deleteBooking('booking-123')
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Connection refused')
    expect(result.current.error).toBe('Connection refused')
  })

  it('should set loading during request', async () => {
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValue(pendingPromise)

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    act(() => {
      result.current.deleteBooking('booking-123')
    })

    expect(result.current.loading).toBe(true)

    // Resolve to cleanup
    act(() => {
      resolvePromise!(createMockResponse({ success: true }, { status: 200 }))
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should use default error message when none provided', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}, { status: 500 }))

    const { result } = renderHook(() => useDeleteUnpaidBooking())

    let response: { success: boolean; error: string | null }
    await act(async () => {
      response = await result.current.deleteBooking('booking-123')
    })

    expect(response!.error).toBe('Failed to delete booking')
  })
})

describe('useCreatePaymentIntent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useCreatePaymentIntent())

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should call correct endpoint', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'pi_secret',
        payment_id: 'payment-123',
        amount: 100,
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreatePaymentIntent())

    await act(async () => {
      await result.current.createIntent('booking-123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: 'booking-123' }),
    })
  })

  it('should return data on successful response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'pi_secret_123',
        payment_id: 'payment-456',
        amount: 200,
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreatePaymentIntent())

    let response: { data: unknown; error: string | null }
    await act(async () => {
      response = await result.current.createIntent('booking-123')
    })

    expect(response!.data).toEqual({
      clientSecret: 'pi_secret_123',
      paymentId: 'payment-456',
      amount: 200,
    })
    expect(result.current.data?.clientSecret).toBe('pi_secret_123')
  })

  it('should reset state when reset is called', async () => {
    mockFetch.mockResolvedValue(createMockResponse({
      data: {
        client_secret: 'secret',
        payment_id: 'pay',
        amount: 100,
      },
    }, { status: 200 }))

    const { result } = renderHook(() => useCreatePaymentIntent())

    await act(async () => {
      await result.current.createIntent('booking-123')
    })

    expect(result.current.data).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
