/**
 * Availability service for computing true venue availability
 * Combines availability records with booking data to return slots that are actually bookable
 */

import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots, ComputedSlot } from '@/utils/slotSplitting'
import type { Availability, Booking, RecurringBooking, SlotActionType, SlotModalContent, SlotPricing } from '@/types'
import { isSlotAllowedByVenueConfig, normalizeVenueAdminConfig } from '@/lib/venueAdminConfig'

interface SlotInstanceRow {
  id: string
  venue_id: string
  date: string
  start_time: string
  end_time: string
  action_type: SlotActionType
  blocks_inventory: boolean
}

interface SlotModalContentRow {
  action_type: SlotActionType
  title: string
  body: string
  bullet_points: string[] | null
  cta_label: string | null
}

interface SlotInstancePricingRow {
  slot_instance_id: string
  amount_cents: number
  currency: string
  unit: SlotPricing['unit']
  payment_method: SlotPricing['payment_method']
}

const DISALLOWED_MODAL_BULLET_POINTS = new Set([
  'Court activity is basketball only during these hours.',
])

export interface UnifiedAvailableSlot {
  date: string
  start_time: string
  end_time: string
  venue_id: string
  availability_id?: string | null
  slot_instance_id?: string | null
  action_type: SlotActionType
  modal_content?: SlotModalContent | null
  slot_pricing?: SlotPricing | null
}

function sortSlots(slots: UnifiedAvailableSlot[]): UnifiedAvailableSlot[] {
  return slots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date)
    }
    return a.start_time.localeCompare(b.start_time)
  })
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart)
}

export class AvailabilityService {
  /**
   * Get true available slots for a venue within a date range
   * Filters out slots that overlap with existing bookings
   * 
   * @param venueId - The venue ID
   * @param dateFrom - Start date (YYYY-MM-DD)
   * @param dateTo - End date (YYYY-MM-DD)
   * @returns Array of computed available slots
   */
  async getAvailableSlots(
    venueId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<UnifiedAvailableSlot[]> {
    const supabase = await createClient()

    const adminConfigQuery = supabase
      .from('venue_admin_configs')
      .select('*')
      .eq('venue_id', venueId)
    const maybeSingle = (adminConfigQuery as { maybeSingle?: () => Promise<{ data: unknown; error: { message?: string; code?: string } | null }> }).maybeSingle
    const adminConfigPromise = maybeSingle
      ? maybeSingle.call(adminConfigQuery)
      : Promise.resolve({ data: null, error: null })

    const [
      { data: venue, error: venueError },
      { data: adminConfigRow, error: adminConfigError },
      availabilityResult,
      bookingsResult,
      recurringResult,
      infoSlotsResult,
      modalContentResult,
    ] = await Promise.all([
      supabase
        .from('venues')
        .select('instant_booking')
        .eq('id', venueId)
        .single(),

      adminConfigPromise,

      supabase
        .from('availability')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('is_available', true)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),
      
      supabase
        .from('bookings')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),
      
      supabase
        .from('recurring_bookings')
        .select('*')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),

      supabase
        .from('slot_instances')
        .select('id, venue_id, date, start_time, end_time, action_type, blocks_inventory')
        .eq('venue_id', venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .eq('is_active', true)
        .eq('action_type', 'info_only_open_gym')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true }),

      supabase
        .from('slot_modal_content')
        .select('action_type, title, body, bullet_points, cta_label')
        .eq('venue_id', venueId),
    ])

    if (venueError || !venue) {
      throw new Error(`Failed to fetch venue for availability: ${venueError?.message || 'Venue not found'}`)
    }

    const isMissingConfigTable = adminConfigError?.code === '42P01'
      || adminConfigError?.message?.toLowerCase().includes('venue_admin_configs')
    if (adminConfigError && !isMissingConfigTable) {
      throw new Error(`Failed to fetch venue admin config: ${adminConfigError.message}`)
    }

    if (availabilityResult.error) {
      throw new Error(`Failed to fetch availability: ${availabilityResult.error.message}`)
    }

    if (bookingsResult.error) {
      throw new Error(`Failed to fetch bookings: ${bookingsResult.error.message}`)
    }

    if (recurringResult.error) {
      throw new Error(`Failed to fetch recurring bookings: ${recurringResult.error.message}`)
    }

    if (infoSlotsResult.error) {
      throw new Error(`Failed to fetch info-only slots: ${infoSlotsResult.error.message}`)
    }

    if (modalContentResult.error) {
      throw new Error(`Failed to fetch slot modal content: ${modalContentResult.error.message}`)
    }

    const availability = (availabilityResult.data || []) as Availability[]
    const bookings = (bookingsResult.data || []) as Booking[]
    const recurringBookings = (recurringResult.data || []) as RecurringBooking[]
    const infoSlots = (infoSlotsResult.data || []) as SlotInstanceRow[]
    const modalContentRows = (modalContentResult.data || []) as SlotModalContentRow[]
    const slotPricingByInstanceId = new Map<string, SlotPricing>()
    const adminConfig = normalizeVenueAdminConfig(venueId, isMissingConfigTable ? null : (adminConfigRow || null))

    if (infoSlots.length > 0) {
      const slotInstanceIds = infoSlots.map((slot) => slot.id)
      const { data: slotPricingRows, error: slotPricingError } = await supabase
        .from('slot_instance_pricing')
        .select('slot_instance_id, amount_cents, currency, unit, payment_method')
        .in('slot_instance_id', slotInstanceIds)

      if (slotPricingError) {
        throw new Error(`Failed to fetch slot pricing: ${slotPricingError.message}`)
      }

      for (const row of (slotPricingRows || []) as SlotInstancePricingRow[]) {
        slotPricingByInstanceId.set(row.slot_instance_id, {
          amount_cents: row.amount_cents,
          currency: row.currency,
          unit: row.unit,
          payment_method: row.payment_method,
        })
      }
    }

    const modalContentByAction = new Map<SlotActionType, SlotModalContent>()
    for (const row of modalContentRows) {
      const filteredBulletPoints = (row.bullet_points || []).filter(
        (point) => !DISALLOWED_MODAL_BULLET_POINTS.has(point)
      )

      modalContentByAction.set(row.action_type, {
        title: row.title,
        body: row.body,
        bullet_points: filteredBulletPoints,
        cta_label: row.cta_label,
      })
    }

    const regularActionType: SlotActionType = venue.instant_booking ? 'instant_book' : 'request_private'
    const computedSlots = computeAvailableSlots(availability, bookings, recurringBookings)

    const regularSlots: UnifiedAvailableSlot[] = computedSlots.map((slot: ComputedSlot) => ({
      ...slot,
      action_type: regularActionType,
      slot_instance_id: null,
      modal_content: null,
      slot_pricing: null,
    }))
      .filter((slot) => isSlotAllowedByVenueConfig(slot, adminConfig))

    const blockingInfoSlots = infoSlots.filter((slot) => slot.blocks_inventory)
    const filteredRegularSlots = regularSlots.filter((slot) => {
      return !blockingInfoSlots.some((infoSlot) => {
        if (infoSlot.date !== slot.date) {
          return false
        }
        return overlaps(slot.start_time, slot.end_time, infoSlot.start_time, infoSlot.end_time)
      })
    })

    const infoOnlySlots: UnifiedAvailableSlot[] = infoSlots.map((slot) => ({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      venue_id: slot.venue_id,
      availability_id: null,
      slot_instance_id: slot.id,
      action_type: slot.action_type,
      modal_content: modalContentByAction.get(slot.action_type) || null,
      slot_pricing:
        slotPricingByInstanceId.get(slot.id) ||
        (adminConfig.drop_in_enabled && adminConfig.drop_in_price
          ? {
              amount_cents: Math.round(adminConfig.drop_in_price * 100),
              currency: 'usd',
              unit: 'person',
              payment_method: 'on_site',
            }
          : null),
    }))
      .filter((slot) => isSlotAllowedByVenueConfig(slot, adminConfig))

    return sortSlots([...filteredRegularSlots, ...infoOnlySlots])
  }
}
