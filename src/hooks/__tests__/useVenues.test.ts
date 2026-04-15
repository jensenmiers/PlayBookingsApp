import { act, renderHook, waitFor } from '@testing-library/react'

import { useVenueAvailabilityRange, type ComputedAvailabilitySlot } from '../useVenues'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function createMockResponse(body: unknown, options: { status?: number } = {}) {
  const status = options.status ?? 200

  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

function createSlot(overrides: Partial<ComputedAvailabilitySlot> = {}): ComputedAvailabilitySlot {
  return {
    date: '2026-02-21',
    start_time: '12:00:00',
    end_time: '13:00:00',
    venue_id: 'venue-1',
    action_type: 'request_private',
    ...overrides,
  }
}

describe('useVenueAvailabilityRange', () => {
  const originalVisibilityState = document.visibilityState
  let visibilityState = 'visible'
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    visibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    })
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: originalVisibilityState,
    })
  })

  it('keeps initialData when mount-time revalidation fails', async () => {
    const initialData = [createSlot()]
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27', { initialData })
    )

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Availability range fetch error:',
        expect.any(Error)
      )
    })

    expect(result.current.data).toEqual(initialData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('keeps previously loaded data when a manual refetch fails', async () => {
    const loadedData = [createSlot()]
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ success: true, data: loadedData }))
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27')
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(loadedData)
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data).toEqual(loadedData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('keeps previously loaded data when a visibility refresh fails', async () => {
    const loadedData = [createSlot()]
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ success: true, data: loadedData }))
      .mockRejectedValueOnce(new Error('Refresh failed'))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27')
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(loadedData)
    })

    visibilityState = 'hidden'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)

    visibilityState = 'visible'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Availability range fetch error:',
        expect.any(Error)
      )
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual(loadedData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error when the first load fails without cached data', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('replaces stale data when a refresh succeeds', async () => {
    const initialData = [createSlot()]
    const refreshedData = [createSlot({ date: '2026-02-22', start_time: '14:00:00', end_time: '15:00:00' })]
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true, data: refreshedData }))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27', { initialData })
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(refreshedData)
    })

    expect(result.current.data).not.toEqual(initialData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
