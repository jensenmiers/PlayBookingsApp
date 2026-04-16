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

  it('uses hydrated initialData without fetching on the first mount for the same range', () => {
    const initialData = [createSlot()]

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27', { initialData })
    )

    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(initialData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches on the first mount when no initialData is provided', async () => {
    const loadedData = [createSlot()]
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true, data: loadedData }))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27')
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(loadedData)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
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

  it('keeps hydrated data when a visibility refresh fails', async () => {
    const initialData = [createSlot()]
    mockFetch.mockRejectedValueOnce(new Error('Refresh failed'))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27', { initialData })
    )

    visibilityState = 'hidden'
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockFetch).toHaveBeenCalledTimes(0)

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

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(initialData)
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

  it('fetches when the params change after hydrated initial data', async () => {
    const initialData = [createSlot()]
    const refreshedData = [createSlot({ date: '2026-02-22', start_time: '14:00:00', end_time: '15:00:00' })]
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true, data: refreshedData }))

    const { result, rerender } = renderHook(
      ({ venueId, dateFrom, dateTo, initialData }) =>
        useVenueAvailabilityRange(venueId, dateFrom, dateTo, { initialData }),
      {
        initialProps: {
          venueId: 'venue-1' as string | null,
          dateFrom: '2026-02-21' as string | null,
          dateTo: '2026-02-27' as string | null,
          initialData,
        },
      }
    )

    rerender({
      venueId: 'venue-1',
      dateFrom: '2026-02-22',
      dateTo: '2026-02-28',
      initialData,
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(refreshedData)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/venues/venue-1/availability?date_from=2026-02-22&date_to=2026-02-28'
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('replaces hydrated data when a manual refetch succeeds', async () => {
    const initialData = [createSlot()]
    const refreshedData = [createSlot({ date: '2026-02-22', start_time: '14:00:00', end_time: '15:00:00' })]
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true, data: refreshedData }))

    const { result } = renderHook(() =>
      useVenueAvailabilityRange('venue-1', '2026-02-21', '2026-02-27', { initialData })
    )

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(refreshedData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
