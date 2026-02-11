/**
 * Unit tests for useUserLocation hook
 * Tests opt-in location behavior: no request on mount, requestLocation triggers getCurrentPosition
 */

import { renderHook, act } from '@testing-library/react'
import { useUserLocation } from '../useVenuesWithNextAvailable'

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
