import {
  INTERNAL_TRAFFIC_DEVICE_FLAG_KEY,
  getDeviceTrafficOverride,
  getInternalTrafficSet,
  getUrlTrafficOverride,
  isInternalEmail,
} from '../internalTraffic'

describe('internalTraffic', () => {
  it('normalizes comma-separated values into a lowercase set', () => {
    const values = getInternalTrafficSet(' Owner@PlayBookings.com, staff@playbookings.com,  ')

    expect(values.has('owner@playbookings.com')).toBe(true)
    expect(values.has('staff@playbookings.com')).toBe(true)
    expect(values.size).toBe(2)
  })

  it('treats exact internal emails as internal traffic', () => {
    const internalEmails = getInternalTrafficSet('owner@playbookings.com')
    const internalDomains = getInternalTrafficSet('')

    expect(isInternalEmail('Owner@PlayBookings.com', internalEmails, internalDomains)).toBe(true)
  })

  it('treats internal domains as internal traffic', () => {
    const internalEmails = getInternalTrafficSet('')
    const internalDomains = getInternalTrafficSet('playbookings.com')

    expect(isInternalEmail('member@PlayBookings.com', internalEmails, internalDomains)).toBe(true)
  })

  it('does not mark unrelated emails as internal', () => {
    const internalEmails = getInternalTrafficSet('owner@playbookings.com')
    const internalDomains = getInternalTrafficSet('playbookings.com')

    expect(isInternalEmail('external@example.com', internalEmails, internalDomains)).toBe(false)
  })

  it('reads internal override from URL query param', () => {
    expect(getUrlTrafficOverride('?internal_traffic=1')).toBe('internal')
    expect(getUrlTrafficOverride('?internal_traffic=true')).toBe('internal')
    expect(getUrlTrafficOverride('?internal_traffic=0')).toBe('external')
    expect(getUrlTrafficOverride('?internal_traffic=false')).toBe('external')
  })

  it('reads internal override from local storage value', () => {
    expect(getDeviceTrafficOverride('internal')).toBe('internal')
    expect(getDeviceTrafficOverride('external')).toBe('external')
    expect(getDeviceTrafficOverride('unexpected')).toBe(null)
    expect(INTERNAL_TRAFFIC_DEVICE_FLAG_KEY).toBe('playbookings_internal_traffic')
  })
})
