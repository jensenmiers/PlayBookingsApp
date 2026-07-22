import type { BookingMode, SlotActionType, SlotPaymentMethod, SlotPricing, SlotPricingUnit } from '@/types'
import { formatCompactNextAvailable } from '@/lib/nextAvailableDisplay'
import { deriveVenuePhotos, type VenueWithOptionalMediaFields } from '@/lib/venueMedia'

/**
 * Discovery venue payload used by home + /search.
 * Trimmed for listing/map cards (not the full venue admin record).
 */
export interface MapVenue {
  id: string
  name: string
  city: string
  state: string
  address: string
  hourlyRate: number
  instantBooking: boolean
  bookingMode: BookingMode | null
  insuranceRequired: boolean
  latitude: number
  longitude: number
  distanceMiles: number | null
  venueType: string
  photo: string | null
  nextAvailable: NextAvailableSlot | null
}

export interface NextAvailableSlot {
  slotId: string
  date: string
  startTime: string
  endTime: string
  actionType: SlotActionType
  pricing: SlotPricing | null
  displayText: string
}

/** Raw row shape returned by get_venues_with_next_available */
export interface VenueDiscoveryRpcRow {
  venue_id: string
  venue_name: string
  venue_city: string
  venue_state: string
  venue_address: string
  hourly_rate: number
  instant_booking: boolean
  booking_mode: BookingMode | null
  insurance_required: boolean
  latitude: number
  longitude: number
  distance_miles: number | null
  next_slot_id: string | null
  next_slot_date: string | null
  next_slot_start_time: string | null
  next_slot_end_time: string | null
  next_slot_action_type?: SlotActionType | null
  next_slot_price_amount_cents?: number | null
  next_slot_price_currency?: string | null
  next_slot_price_unit?: SlotPricingUnit | null
  next_slot_payment_method?: SlotPaymentMethod | null
}

export type VenueDiscoveryEnrichmentRow = VenueWithOptionalMediaFields & {
  id: string
  venue_type?: string | null
}

const DEFAULT_VENUE_TYPE = 'Sports Facility'

export function buildMapVenuesFromDiscovery(
  rpcRows: VenueDiscoveryRpcRow[] | null | undefined,
  enrichmentRows: VenueDiscoveryEnrichmentRow[] | null | undefined = []
): MapVenue[] {
  const enrichmentById = new Map(
    (enrichmentRows || []).map((row) => [row.id, row] as const)
  )

  return (rpcRows || []).map((row) => {
    const enrichment = enrichmentById.get(row.venue_id)
    const photos = enrichment ? deriveVenuePhotos(enrichment) : []
    const nextSlotPricing =
      row.next_slot_price_amount_cents != null
      && row.next_slot_price_currency
      && row.next_slot_price_unit
      && row.next_slot_payment_method
        ? {
            amount_cents: Number(row.next_slot_price_amount_cents),
            currency: row.next_slot_price_currency,
            unit: row.next_slot_price_unit,
            payment_method: row.next_slot_payment_method,
          } satisfies SlotPricing
        : null

    return {
      id: row.venue_id,
      name: row.venue_name,
      city: row.venue_city,
      state: row.venue_state,
      address: row.venue_address,
      hourlyRate: Number(row.hourly_rate),
      instantBooking: row.instant_booking,
      bookingMode: row.booking_mode,
      insuranceRequired: row.insurance_required,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      distanceMiles: row.distance_miles,
      venueType: enrichment?.venue_type?.trim() || DEFAULT_VENUE_TYPE,
      photo: photos[0] || null,
      nextAvailable:
        row.next_slot_id && row.next_slot_date && row.next_slot_start_time
          ? {
              slotId: row.next_slot_id,
              date: row.next_slot_date,
              startTime: row.next_slot_start_time,
              endTime: row.next_slot_end_time || '',
              actionType: row.next_slot_action_type
                || (row.instant_booking ? 'instant_book' : 'request_private'),
              pricing: nextSlotPricing,
              displayText: formatCompactNextAvailable(
                row.next_slot_date,
                row.next_slot_start_time
              ),
            }
          : null,
    }
  })
}
