import {
  formatVenueCardPricing,
  getVenueAccessLabels,
  isVenueAccessFilter,
  matchesAccessFilter,
  resolveVenueAccess,
  type VenueAccessFilter,
} from '@/lib/venueAccess'

describe('venueAccess', () => {
  const hybrid = {
    offers_open_gym: true,
    offers_private_rental: true,
    drop_in_price: 3,
    hourly_rate: 120,
  }

  const openGymOnly = {
    offers_open_gym: true,
    offers_private_rental: false,
    drop_in_price: 5,
    hourly_rate: 100,
  }

  const rentalOnly = {
    offers_open_gym: false,
    offers_private_rental: true,
    drop_in_price: null,
    hourly_rate: 80,
  }

  it('resolves access flags with safe defaults', () => {
    expect(resolveVenueAccess(hybrid)).toEqual({
      offersOpenGym: true,
      offersPrivateRental: true,
    })
    expect(resolveVenueAccess({})).toEqual({
      offersOpenGym: false,
      offersPrivateRental: true,
    })
  })

  it('returns Open Gym / Private Rental labels', () => {
    expect(getVenueAccessLabels(hybrid)).toEqual(['Open Gym', 'Private Rental'])
    expect(getVenueAccessLabels(openGymOnly)).toEqual(['Open Gym'])
    expect(getVenueAccessLabels(rentalOnly)).toEqual(['Private Rental'])
  })

  it('formats dual card pricing for hybrids', () => {
    expect(formatVenueCardPricing(hybrid)).toEqual({
      dropIn: '$3 drop-in',
      hourly: '$120/hr',
    })
    expect(formatVenueCardPricing(openGymOnly)).toEqual({
      dropIn: '$5 drop-in',
      hourly: null,
    })
    expect(formatVenueCardPricing(rentalOnly)).toEqual({
      dropIn: null,
      hourly: '$80/hr',
    })
  })

  it('matches hybrids in both Open Gym and Private Rentals filters', () => {
    const filters: VenueAccessFilter[] = ['all', 'open_gym', 'private_rental']
    for (const filter of filters) {
      expect(matchesAccessFilter(hybrid, filter)).toBe(true)
    }
    expect(matchesAccessFilter(openGymOnly, 'open_gym')).toBe(true)
    expect(matchesAccessFilter(openGymOnly, 'private_rental')).toBe(false)
    expect(matchesAccessFilter(rentalOnly, 'private_rental')).toBe(true)
    expect(matchesAccessFilter(rentalOnly, 'open_gym')).toBe(false)
  })

  it('validates access filter query values', () => {
    expect(isVenueAccessFilter('open_gym')).toBe(true)
    expect(isVenueAccessFilter('private_rental')).toBe(true)
    expect(isVenueAccessFilter('all')).toBe(true)
    expect(isVenueAccessFilter('hybrid')).toBe(false)
  })
})
