/**
 * Availability service for computing true venue availability
 * Uses slot_instances as the source of truth and filters out blocked slots.
 */

import { createClient } from '@/lib/supabase/server'
import { timeStringToDate } from '@/utils/dateHelpers'
import type { SlotActionType, SlotModalContent, SlotPricing } from '@/types'
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

interface RegularAvailableSlotRow {
  venue_id: string
  slot_id: string
  slot_date: string
  start_time: string
  end_time: string
  action_type: SlotActionType
}

interface SlotModalContentRow {
  action_type: SlotActionType
  title: string
  body: string
  bullet_points: string[] | null
  cta_label: string | null
}

interface ExternalAvailabilityBlockRow {
  id: string
  venue_id: string
  source: string
  source_event_id: string | null
  start_at: string
  end_at: string
  status: 'active' | 'cancelled'
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

function overlapsExternalBlock(
  slot: { date: string; start_time: string; end_time: string },
  block: ExternalAvailabilityBlockRow
): boolean {
  const slotStartMs = timeStringToDate(slot.date, slot.start_time).getTime()
  const slotEndMs = timeStringToDate(slot.date, slot.end_time).getTime()
  const blockStartMs = new Date(block.start_at).getTime()
  const blockEndMs = new Date(block.end_at).getTime()

  return slotStartMs < blockEndMs && slotEndMs > blockStartMs
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
    const now = new Date()

    const adminConfigQuery = supabase
      .from('venue_admin_configs')
      .select('*')
      .eq('venue_id', venueId)
    const maybeSingle = (
      adminConfigQuery as {
        maybeSingle?: () => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>
      }
    ).maybeSingle
    const adminConfigPromise = maybeSingle
      ? maybeSingle.call(adminConfigQuery)
      : Promise.resolve({ data: null, error: null })

    const [
      { data: venue, error: venueError },
      { data: adminConfigRow, error: adminConfigError },
      regularSlotsResult,
      infoSlotsResult,
      modalContentResult,
      externalBlocksResult,
    ] = await Promise.all([
      supabase
        .from('venues')
        .select('instant_booking')
        .eq('id', venueId)
        .single(),

      adminConfigPromise,

      supabase.rpc('get_regular_available_slot_instances', {
        p_venue_id: venueId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_date_filter: null,
      }),

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

      supabase
        .from('external_availability_blocks')
        .select('id, venue_id, source, source_event_id, start_at, end_at, status')
        .eq('venue_id', venueId)
        .eq('status', 'active'),
    ])

    if (venueError || !venue) {
      throw new Error(`Failed to fetch venue for availability: ${venueError?.message || 'Venue not found'}`)
    }

    const isMissingConfigTable = adminConfigError?.code === '42P01'
      || adminConfigError?.message?.toLowerCase().includes('venue_admin_configs')
    if (adminConfigError && !isMissingConfigTable) {
      throw new Error(`Failed to fetch venue admin config: ${adminConfigError.message}`)
    }

    if (regularSlotsResult.error) {
      throw new Error(`Failed to fetch regular available slots: ${regularSlotsResult.error.message}`)
    }

    if (infoSlotsResult.error) {
      throw new Error(`Failed to fetch info-only slots: ${infoSlotsResult.error.message}`)
    }

    if (modalContentResult.error) {
      throw new Error(`Failed to fetch slot modal content: ${modalContentResult.error.message}`)
    }
    const isMissingExternalBlocksTable = externalBlocksResult.error?.code === '42P01'
      || externalBlocksResult.error?.message?.toLowerCase().includes('external_availability_blocks')
    if (externalBlocksResult.error && !isMissingExternalBlocksTable) {
      throw new Error(`Failed to fetch external availability blocks: ${externalBlocksResult.error.message}`)
    }

    const adminConfig = normalizeVenueAdminConfig(venueId, isMissingConfigTable ? null : (adminConfigRow || null))
    const regularAvailableSlots = ((regularSlotsResult.data || []) as RegularAvailableSlotRow[])
    const infoSlots = ((infoSlotsResult.data || []) as SlotInstanceRow[])
    const externalBlocks = isMissingExternalBlocksTable
      ? []
      : ((externalBlocksResult.data || []) as ExternalAvailabilityBlockRow[])
    const enabledInfoSlots = adminConfig.drop_in_enabled ? infoSlots : []
    const modalContentRows = (modalContentResult.data || []) as SlotModalContentRow[]

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

    const regularSlots: UnifiedAvailableSlot[] = regularAvailableSlots.map((slot) => ({
      date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      venue_id: slot.venue_id,
      availability_id: null,
      slot_instance_id: slot.slot_id,
      action_type: slot.action_type,
      modal_content: null,
      slot_pricing: null,
    }))

    const dropInSlotPricing = adminConfig.drop_in_price
      ? ({
          amount_cents: Math.round(adminConfig.drop_in_price * 100),
          currency: 'usd',
          unit: 'person',
          payment_method: 'on_site',
        } satisfies SlotPricing)
      : null

    const infoOnlySlots: UnifiedAvailableSlot[] = enabledInfoSlots.map((slot) => ({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      venue_id: slot.venue_id,
      availability_id: null,
      slot_instance_id: slot.id,
      action_type: slot.action_type,
      modal_content: modalContentByAction.get(slot.action_type) || null,
      slot_pricing: dropInSlotPricing,
    }))
      .filter((slot) => timeStringToDate(slot.date, slot.start_time) >= now)
      .filter((slot) => !externalBlocks.some((block) => overlapsExternalBlock(slot, block)))
      .filter((slot) => isSlotAllowedByVenueConfig(slot, adminConfig))

    return sortSlots([...regularSlots, ...infoOnlySlots])
  }
}
