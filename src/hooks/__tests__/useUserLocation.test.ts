/**
 * Unit tests for useUserLocation hook
 * Tests opt-in location behavior: no request on mount, requestLocation triggers getCurrentPosition
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useUserLocation, useVenuesWithNextAvailable } from '../useVenuesWithNextAvailable'

function createMockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const status = init.status ?? (init.ok === false ? 500 : 200)
  const ok = init.ok ?? (status >= 200 && status < 300)
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

describe('useUserLocation', () => {
  let mockGetCurrentPosition: jest.Mock

  beforeEach(() => {
    mockGetCurrentPosition = jest.fn()
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: jest.fn(),
        clearWatch: jest.fn(),
      },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('has correct initial state', () => {
    const { result } = renderHook(() => useUserLocation())

    expect(result.current.latitude).toBeNull()
    expect(result.current.longitude).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.requestLocation).toBe('function')
  })

  it('does not call getCurrentPosition on mount', () => {
    renderHook(() => useUserLocation())

    expect(mockGetCurrentPosition).not.toHaveBeenCalled()
  })

  it('calls getCurrentPosition when requestLocation is invoked', async () => {
    mockGetCurrentPosition.mockImplementation((success: (p: { coords: { latitude: number; longitude: number } }) => void) => {
      queueMicrotask(() => success({ coords: { latitude: 34.05, longitude: -118.24 } }))
    })

    const { result } = renderHook(() => useUserLocation())

    await act(async () => {
      result.current.requestLocation()
      await Promise.resolve()
    })

    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1)
    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      })
    )
  })

  it('sets coords and loading false on success', async () => {
    mockGetCurrentPosition.mockImplementation((success: (p: { coords: { latitude: number; longitude: number } }) => void) => {
      queueMicrotask(() => success({ coords: { latitude: 34.05, longitude: -118.24 } }))
    })

    const { result } = renderHook(() => useUserLocation())

    await act(async () => {
      result.current.requestLocation()
      await Promise.resolve()
    })

    expect(result.current.latitude).toBe(34.05)
    expect(result.current.longitude).toBe(-118.24)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading true during request', async () => {
    let captureSuccess: (p: { coords: { latitude: number; longitude: number } }) => void
    mockGetCurrentPosition.mockImplementation((success: (p: { coords: { latitude: number; longitude: number } }) => void) => {
      captureSuccess = success
    })

    const { result } = renderHook(() => useUserLocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      captureSuccess!({ coords: { latitude: 34.05, longitude: -118.24 } })
    })
  })

  it('sets loading false on error without treating as fatal', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    mockGetCurrentPosition.mockImplementation((_success: () => void, error: (err: { message: string }) => void) => {
      queueMicrotask(() => error({ message: 'User denied geolocation' }))
    })

    const { result } = renderHook(() => useUserLocation())

    await act(async () => {
      result.current.requestLocation()
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.latitude).toBeNull()
    expect(result.current.longitude).toBeNull()
    expect(result.current.error).toBeNull()
    consoleSpy.mockRestore()
  })

  it('sets error when geolocation is not supported', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useUserLocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.error).toBe('Geolocation is not supported')
    expect(result.current.loading).toBe(false)
  })
})

describe('useVenuesWithNextAvailable', () => {
  let consoleErrorSpy: jest.SpyInstance
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    jest.useRealTimers()
  })

  it('loads discovery venues from /api/venues/next-available', async () => {
    mockFetch.mockResolvedValue(
      createMockResponse({
        success: true,
        data: [
          {
            id: 'venue-1',
            name: 'Crosscourt',
            city: 'Los Angeles',
            state: 'CA',
            address: '123 Court St',
            hourlyRate: 125,
            instantBooking: true,
            bookingMode: 'instant_slots',
            insuranceRequired: false,
            offersOpenGym: false,
            offersPrivateRental: true,
            dropInPrice: null,
            latitude: 34.05,
            longitude: -118.24,
            distanceMiles: null,
            venueType: 'Indoor Court',
            photo: 'https://example.com/crosscourt.jpg',
            nextAvailable: {
              slotId: 'slot-1',
              date: '2026-02-20',
              startTime: '18:00:00',
              endTime: '19:00:00',
              displayText: 'Fri Feb 20, 6 PM',
            },
          },
        ],
      })
    )

    const { result } = renderHook(() => useVenuesWithNextAvailable())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/venues/next-available', { cache: 'no-store' })
    expect(result.current.data?.[0].nextAvailable?.displayText).toBe('Fri Feb 20, 6 PM')
    expect(result.current.data?.[0].photo).toBe('https://example.com/crosscourt.jpg')
    expect(result.current.data?.[0].venueType).toBe('Indoor Court')
  })

  it('keeps previously loaded venues when a refetch fails', async () => {
    const loadedVenue = {
      id: 'venue-1',
      name: 'Crosscourt',
      city: 'Los Angeles',
      state: 'CA',
      address: '123 Court St',
      hourlyRate: 125,
      instantBooking: true,
      bookingMode: 'instant_slots',
      insuranceRequired: false,
      offersOpenGym: false,
      offersPrivateRental: true,
      dropInPrice: null,
      latitude: 34.05,
      longitude: -118.24,
      distanceMiles: null,
      venueType: 'Indoor Court',
      photo: null,
      nextAvailable: {
        slotId: 'slot-1',
        date: '2026-02-20',
        startTime: '18:00:00',
        endTime: '19:00:00',
        displayText: 'Fri Feb 20, 6 PM',
      },
    }

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ success: true, data: [loadedVenue] }))
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useVenuesWithNextAvailable())

    await waitFor(() => {
      expect(result.current.data?.[0].id).toBe('venue-1')
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data?.[0].id).toBe('venue-1')
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('ignores stale venue responses after options change', async () => {
    let resolveFirstRequest: (value: unknown) => void = () => {}
    let resolveSecondRequest: (value: unknown) => void = () => {}

    mockFetch
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveFirstRequest = resolve
      }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveSecondRequest = resolve
      }))

    const firstVenue = {
      id: 'venue-1',
      name: 'Old Result',
      city: 'Los Angeles',
      state: 'CA',
      address: '123 Court St',
      hourlyRate: 125,
      instantBooking: true,
      bookingMode: null,
      insuranceRequired: false,
      offersOpenGym: false,
      offersPrivateRental: true,
      dropInPrice: null,
      latitude: 34.05,
      longitude: -118.24,
      distanceMiles: null,
      venueType: 'Sports Facility',
      photo: null,
      nextAvailable: null,
    }

    const secondVenue = {
      ...firstVenue,
      id: 'venue-2',
      name: 'Current Result',
    }

    const { result, rerender } = renderHook(
      ({ dateFilter }: { dateFilter?: string }) => useVenuesWithNextAvailable({ dateFilter }),
      { initialProps: { dateFilter: undefined } }
    )

    rerender({ dateFilter: '2026-02-20' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    await act(async () => {
      resolveSecondRequest(createMockResponse({ success: true, data: [secondVenue] }))
      await Promise.resolve()
    })

    expect(result.current.data?.[0].name).toBe('Current Result')

    await act(async () => {
      resolveFirstRequest(createMockResponse({ success: true, data: [firstVenue] }))
      await Promise.resolve()
    })

    expect(result.current.data?.[0].name).toBe('Current Result')
    expect(result.current.loading).toBe(false)
  })

  it('times out an unresponsive venue request instead of loading forever', async () => {
    jest.useFakeTimers()
    mockFetch.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useVenuesWithNextAvailable())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      jest.advanceTimersByTime(12_000)
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Timed out loading venues. Please try again.')
  })

  it('times out a stalled response body instead of loading forever', async () => {
    jest.useFakeTimers()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => new Promise(() => {}),
    } as Response)

    const { result } = renderHook(() => useVenuesWithNextAvailable())

    expect(result.current.loading).toBe(true)

    await act(async () => {
      jest.advanceTimersByTime(12_000)
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Timed out loading venues. Please try again.')
  })

  it('ignores stale venue responses that finish parsing after a newer request', async () => {
    let resolveFirstFetch: (value: unknown) => void = () => {}
    let resolveFirstJson: (value: unknown) => void = () => {}

    const firstVenue = {
      id: 'venue-1',
      name: 'Old Result',
      city: 'Los Angeles',
      state: 'CA',
      address: '123 Court St',
      hourlyRate: 125,
      instantBooking: true,
      bookingMode: null,
      insuranceRequired: false,
      offersOpenGym: false,
      offersPrivateRental: true,
      dropInPrice: null,
      latitude: 34.05,
      longitude: -118.24,
      distanceMiles: null,
      venueType: 'Sports Facility',
      photo: null,
      nextAvailable: null,
    }

    const secondVenue = {
      ...firstVenue,
      id: 'venue-2',
      name: 'Current Result',
    }

    mockFetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstFetch = resolve
          })
      )
      .mockResolvedValueOnce(
        createMockResponse({ success: true, data: [secondVenue] })
      )

    const { result, rerender } = renderHook(
      ({ dateFilter }: { dateFilter?: string }) => useVenuesWithNextAvailable({ dateFilter }),
      { initialProps: { dateFilter: undefined } }
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    // First Response arrives and passes the pre-json stale check, but body parsing is deferred.
    await act(async () => {
      resolveFirstFetch({
        ok: true,
        status: 200,
        json: () =>
          new Promise((resolve) => {
            resolveFirstJson = resolve
          }),
      })
      await Promise.resolve()
    })

    // Newer request starts while the older body is still parsing.
    rerender({ dateFilter: '2026-02-20' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.current.data?.[0].name).toBe('Current Result')
    })

    await act(async () => {
      resolveFirstJson({ success: true, data: [firstVenue] })
      await Promise.resolve()
    })

    expect(result.current.data?.[0].name).toBe('Current Result')
    expect(result.current.loading).toBe(false)
  })

  it('forwards filter options as query params', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ success: true, data: [] }))

    const { result } = renderHook(() =>
      useVenuesWithNextAvailable({
        dateFilter: '2026-02-20',
        userLat: 34.05,
        userLng: -118.24,
        radiusMiles: 10,
        accessFilter: 'private_rental',
      })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/venues/next-available?date=2026-02-20&lat=34.05&lng=-118.24&radiusMiles=10&access=private_rental',
      { cache: 'no-store' }
    )
  })

  it('does not retain stale all-segment data when a new access scope fails', async () => {
    const loadedVenue = {
      id: 'venue-1',
      name: 'All Segment Result',
      city: 'Los Angeles',
      state: 'CA',
      address: '123 Court St',
      hourlyRate: 125,
      instantBooking: true,
      bookingMode: 'instant_slots',
      insuranceRequired: false,
      offersOpenGym: true,
      offersPrivateRental: true,
      dropInPrice: 3,
      latitude: 34.05,
      longitude: -118.24,
      distanceMiles: null,
      venueType: 'Indoor Court',
      photo: null,
      nextAvailable: null,
    }

    mockFetch
      .mockResolvedValueOnce(createMockResponse({ success: true, data: [loadedVenue] }))
      .mockRejectedValueOnce(new Error('Private rental discovery failed'))

    const { result, rerender } = renderHook(
      ({ accessFilter }: { accessFilter: 'all' | 'private_rental' }) =>
        useVenuesWithNextAvailable({ accessFilter }),
      {
        initialProps: {
          accessFilter: 'all',
        } as { accessFilter: 'all' | 'private_rental' },
      }
    )

    await waitFor(() => {
      expect(result.current.data?.[0].name).toBe('All Segment Result')
    })

    rerender({ accessFilter: 'private_rental' })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Private rental discovery failed')
    })

    expect(result.current.data).toBeNull()
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/venues/next-available?access=private_rental',
      { cache: 'no-store' }
    )
  })
})
