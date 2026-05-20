import { buildHomeInitialDataState } from '../home-initial-data-state'

describe('buildHomeInitialDataState', () => {
  it('combines loading and prefers first available error', () => {
    const state = buildHomeInitialDataState({
      venues: null,
      availabilityVenues: null,
      venuesLoading: false,
      availabilityLoading: true,
      venuesError: null,
      availabilityError: 'timeout',
    })

    expect(state.venues).toEqual([])
    expect(state.availabilityVenues).toEqual([])
    expect(state.loading).toBe(true)
    expect(state.error).toBe('timeout')
  })

  it('uses venues error when both errors are present', () => {
    const state = buildHomeInitialDataState({
      venues: [],
      availabilityVenues: [],
      venuesLoading: false,
      availabilityLoading: false,
      venuesError: 'venues failed',
      availabilityError: 'availability failed',
    })

    expect(state.error).toBe('venues failed')
  })
})
