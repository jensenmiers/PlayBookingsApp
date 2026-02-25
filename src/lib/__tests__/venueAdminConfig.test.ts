import { normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'

describe('normalizeVenueAdminConfig', () => {
  it('keeps a positive drop-in price', () => {
    const config = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: 25,
    })

    expect(config.drop_in_enabled).toBe(true)
    expect(config.drop_in_price).toBe(25)
  })

  it('normalizes missing or non-positive drop-in price to null', () => {
    const nullPriceConfig = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: null,
    })
    const zeroPriceConfig = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: 0,
    })

    expect(nullPriceConfig.drop_in_price).toBeNull()
    expect(zeroPriceConfig.drop_in_price).toBeNull()
  })
})
