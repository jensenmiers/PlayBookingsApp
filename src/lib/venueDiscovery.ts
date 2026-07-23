import type { BookingMode } from '@/types'
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
  offersOpenGym: boolean
  offersPrivateRental: boolean
  dropInPrice: number | null
  latitude: number | null
  longitude: number | null
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
  offers_open_gym?: boolean | null
  offers_private_rental?: boolean | null
  drop_in_price?: number | null
  latitude: number | null
  longitude: number | null
  distance_miles: number | null
  next_slot_id: string | null
  next_slot_date: string | null
  next_slot_start_time: string | null
  next_slot_end_time: string | null
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

    const dropInPrice =
      row.drop_in_price == null || row.drop_in_price === undefined
        ? null
        : Number(row.drop_in_price)
    const latitude =
      row.latitude == null || row.latitude === undefined ? null : Number(row.latitude)
    const longitude =
      row.longitude == null || row.longitude === undefined ? null : Number(row.longitude)

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
      offersOpenGym: Boolean(row.offers_open_gym),
      offersPrivateRental: row.offers_private_rental !== false,
      dropInPrice: Number.isFinite(dropInPrice as number) ? dropInPrice : null,
      latitude: Number.isFinite(latitude as number) ? latitude : null,
      longitude: Number.isFinite(longitude as number) ? longitude : null,
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
              displayText: formatCompactNextAvailable(
                row.next_slot_date,
                row.next_slot_start_time
              ),
            }
          : null,
    }
  })
}
