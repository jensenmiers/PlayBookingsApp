import { formatDiscoveryPrice, isOpenGymDiscovery } from '../discoveryPresentation'
import type { NextAvailableSlot } from '@/lib/venueDiscovery'

function createNextAvailable(
  overrides: Partial<NextAvailableSlot> = {}
): NextAvailableSlot {
  return {
    slotId: 'slot-1',
    date: '2026-02-20',
    startTime: '15:00:00',
    endTime: '16:00:00',
    actionType: 'instant_book',
    pricing: null,
    displayText: 'Fri Feb 20, 3 PM',
    ...overrides,
  }
}

describe('discoveryPresentation', () => {
  it('detects open-gym discovery slots', () => {
    expect(isOpenGymDiscovery(createNextAvailable({
      actionType: 'info_only_open_gym',
    }))).toBe(true)
    expect(isOpenGymDiscovery(createNextAvailable({
      actionType: 'instant_book',
    }))).toBe(false)
  })

  it('uses instance pricing for rental discovery when present', () => {
    expect(formatDiscoveryPrice(
      createNextAvailable({
        actionType: 'instant_book',
        pricing: {
          amount_cents: 15000,
          currency: 'USD',
          unit: 'hour',
          payment_method: 'in_app',
        },
      }),
      75
    )).toBe('$150/hr')
  })

  it('falls back to venue hourly rate for rentals without instance pricing', () => {
    expect(formatDiscoveryPrice(
      createNextAvailable({ actionType: 'request_private', pricing: null }),
      75
    )).toBe('$75/hr')
  })

  it('uses open-gym pricing when present and falls back when missing', () => {
    expect(formatDiscoveryPrice(
      createNextAvailable({
        actionType: 'info_only_open_gym',
        pricing: {
          amount_cents: 300,
          currency: 'USD',
          unit: 'person',
          payment_method: 'on_site',
        },
      }),
      75
    )).toBe('$3/person')

    expect(formatDiscoveryPrice(
      createNextAvailable({
        actionType: 'info_only_open_gym',
        pricing: null,
      }),
      75
    )).toBe('Drop-in price on site')
  })
})
