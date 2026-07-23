import type { NextAvailableSlot } from '@/lib/venueDiscovery'

const UNIT_SUFFIX = {
  hour: '/hr',
  person: '/person',
  session: '/session',
} as const

export function isOpenGymDiscovery(nextAvailable: NextAvailableSlot | null): boolean {
  return nextAvailable?.actionType === 'info_only_open_gym'
}

export function formatDiscoveryPrice(
  nextAvailable: NextAvailableSlot | null,
  hourlyRate: number
): string {
  if (nextAvailable?.pricing) {
    const { amount_cents: amountCents, currency, unit } = nextAvailable.pricing
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amountCents / 100)

    return `${amount}${UNIT_SUFFIX[unit]}`
  }

  if (isOpenGymDiscovery(nextAvailable)) {
    return 'Drop-in price on site'
  }

  return `$${hourlyRate}/hr`
}
