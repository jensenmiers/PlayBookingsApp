export type VenueAccessFilter = 'all' | 'open_gym' | 'private_rental'

export type VenueAccessFields = {
  offers_open_gym?: boolean | null
  offers_private_rental?: boolean | null
  drop_in_price?: number | null
  hourly_rate?: number | null
}

export function isVenueAccessFilter(value: unknown): value is VenueAccessFilter {
  return value === 'all' || value === 'open_gym' || value === 'private_rental'
}

export function parseVenueAccessFilter(value: unknown): VenueAccessFilter {
  if (isVenueAccessFilter(value)) {
    return value
  }
  return 'all'
}

export function resolveVenueAccess(venue: VenueAccessFields): {
  offersOpenGym: boolean
  offersPrivateRental: boolean
} {
  return {
    offersOpenGym: Boolean(venue.offers_open_gym),
    // Marketplace default: private rental unless explicitly disabled.
    offersPrivateRental: venue.offers_private_rental !== false,
  }
}

export function getVenueAccessLabels(venue: VenueAccessFields): Array<'Open Gym' | 'Private Rental'> {
  const { offersOpenGym, offersPrivateRental } = resolveVenueAccess(venue)
  const labels: Array<'Open Gym' | 'Private Rental'> = []
  if (offersOpenGym) {
    labels.push('Open Gym')
  }
  if (offersPrivateRental) {
    labels.push('Private Rental')
  }
  return labels
}

function formatMoneyAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
}

export function formatVenueCardPricing(venue: VenueAccessFields): {
  dropIn: string | null
  hourly: string | null
} {
  const { offersOpenGym, offersPrivateRental } = resolveVenueAccess(venue)
  const dropInPrice = venue.drop_in_price
  const hourlyRate = venue.hourly_rate

  return {
    dropIn:
      offersOpenGym && dropInPrice != null && dropInPrice > 0
        ? `$${formatMoneyAmount(Number(dropInPrice))} drop-in`
        : null,
    hourly:
      offersPrivateRental && hourlyRate != null && hourlyRate > 0
        ? `$${formatMoneyAmount(Number(hourlyRate))}/hr`
        : null,
  }
}

export function matchesAccessFilter(
  venue: VenueAccessFields,
  filter: VenueAccessFilter
): boolean {
  if (filter === 'all') {
    return true
  }

  const { offersOpenGym, offersPrivateRental } = resolveVenueAccess(venue)

  if (filter === 'open_gym') {
    return offersOpenGym
  }

  return offersPrivateRental
}

export function formatVenueCardPriceLine(venue: VenueAccessFields): string {
  const { dropIn, hourly } = formatVenueCardPricing(venue)
  return [dropIn, hourly].filter(Boolean).join(' · ')
}
