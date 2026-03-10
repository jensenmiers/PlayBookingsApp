import { createAdminClient } from '@/lib/supabase/admin'
import {
  PLATFORM_TIME_ZONE,
  isSlotAllowedByVenueConfig,
  normalizeVenueAdminConfig,
} from '@/lib/venueAdminConfig'
import { deriveRegularTemplateWindowsFromOperatingHours } from '@/lib/operatingHoursTemplates'
import type {
  AdminVenueAvailabilityPreviewDay,
  AdminVenueAvailabilityPreviewReason,
  AdminVenueAvailabilityPreviewRequest,
  AdminVenueAvailabilityPreviewWindow,
} from '@/types/api'
import type { BookingStatus, DropInTemplateWindow, OperatingHourWindow, SlotActionType } from '@/types'
import type { UnifiedAvailableSlot } from '@/services/availabilityService'
import { AvailabilityService } from '@/services/availabilityService'
import { badRequest, notFound } from '@/utils/errorHandling'

type PreviewWindow = {
  date: string
  start_time: string
  end_time: string
  kind?: 'private_booking' | 'drop_in'
}

type PreviewBookingWindow = {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
}

type PreviewExternalBlock = {
  start_at: string
  end_at: string
  source: string
  status: 'active' | 'cancelled'
}

type PreviewDayBuildArgs = {
  dateRange: string[]
  request: AdminVenueAvailabilityPreviewRequest
  now: Date
  bookings: PreviewBookingWindow[]
  recurringBookings: PreviewBookingWindow[]
  externalBlocks: PreviewExternalBlock[]
}

type PreviewSummaryBuildArgs = PreviewDayBuildArgs & {
  finalSlots: PreviewWindow[]
}

type PreviewRequestComparisonArgs = {
  venueId: string
  currentConfig: ReturnType<typeof normalizeVenueAdminConfig>
  currentDropInTemplates: DropInTemplateWindow[]
  instantBooking: boolean
}

function normalizeTime(value: string): string {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return value
}

function getDateStringInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = Number(parts.find((part) => part.type === 'year')?.value || '0')
  const month = Number(parts.find((part) => part.type === 'month')?.value || '0')
  const day = Number(parts.find((part) => part.type === 'day')?.value || '0')

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function getNextSevenDates(now: Date): string[] {
  const start = getDateStringInTimeZone(now, PLATFORM_TIME_ZONE)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function getDayOfWeek(dateValue: string): number {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

function toMinutes(time: string): number {
  const [hour, minute] = normalizeTime(time).split(':').map(Number)
  return hour * 60 + minute
}

function fromMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

function buildComparisonRequest(args: PreviewRequestComparisonArgs): AdminVenueAvailabilityPreviewRequest {
  return normalizePreviewRequest({
    operating_hours: args.currentConfig.operating_hours,
    drop_in_enabled: args.currentConfig.drop_in_enabled,
    drop_in_price: args.currentConfig.drop_in_price,
    drop_in_templates: args.currentDropInTemplates,
    instant_booking: args.instantBooking,
    min_advance_booking_days: args.currentConfig.min_advance_booking_days,
    min_advance_lead_time_hours: args.currentConfig.min_advance_lead_time_hours,
    blackout_dates: args.currentConfig.blackout_dates,
    holiday_dates: args.currentConfig.holiday_dates,
  })
}

export function normalizePreviewRequest(
  request: AdminVenueAvailabilityPreviewRequest
): AdminVenueAvailabilityPreviewRequest {
  const normalizeWindows = (windows: OperatingHourWindow[] | DropInTemplateWindow[]) =>
    windows
      .map((window) => ({
        day_of_week: Number(window.day_of_week),
        start_time: normalizeTime(window.start_time),
        end_time: normalizeTime(window.end_time),
      }))
      .sort((left, right) => {
        if (left.day_of_week !== right.day_of_week) {
          return left.day_of_week - right.day_of_week
        }
        if (left.start_time !== right.start_time) {
          return left.start_time.localeCompare(right.start_time)
        }
        return left.end_time.localeCompare(right.end_time)
      })

  return {
    operating_hours: normalizeWindows(request.operating_hours),
    drop_in_enabled: request.drop_in_enabled,
    drop_in_price: request.drop_in_price,
    drop_in_templates: normalizeWindows(request.drop_in_templates),
    instant_booking: request.instant_booking,
    min_advance_booking_days: request.min_advance_booking_days,
    min_advance_lead_time_hours: request.min_advance_lead_time_hours,
    blackout_dates: [...request.blackout_dates].sort((a, b) => a.localeCompare(b)),
    holiday_dates: [...request.holiday_dates].sort((a, b) => a.localeCompare(b)),
  }
}

function expandWindowsForDate(date: string, windows: DropInTemplateWindow[]): PreviewWindow[] {
  const dayOfWeek = getDayOfWeek(date)
  return windows
    .filter((window) => window.day_of_week === dayOfWeek)
    .map((window) => ({
      date,
      start_time: normalizeTime(window.start_time),
      end_time: normalizeTime(window.end_time),
    }))
}

function mergeAdjacentWindows(windows: PreviewWindow[]): AdminVenueAvailabilityPreviewWindow[] {
  const sorted = [...windows].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date)
    }
    return left.start_time.localeCompare(right.start_time)
  })

  const merged: PreviewWindow[] = []
  for (const window of sorted) {
    const previous = merged.at(-1)
    if (
      previous &&
      previous.date === window.date &&
      previous.end_time === window.start_time
    ) {
      previous.end_time = window.end_time
      continue
    }

    merged.push({ ...window })
  }

  return merged.map((window) => ({
    start_time: window.start_time,
    end_time: window.end_time,
  }))
}

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  )

  return asUtc - date.getTime()
}

function zonedDateTimeToDate(dateValue: string, timeValue: string, timeZone: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes, seconds] = normalizeTime(timeValue).split(':').map(Number)

  let utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds)
  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(timeZone, new Date(utcMs))
    utcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds) - offset
  }

  return new Date(utcMs)
}

function getTimePartsInTimeZone(date: Date, timeZone: string): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  return {
    hours: Number(parts.find((part) => part.type === 'hour')?.value || '0'),
    minutes: Number(parts.find((part) => part.type === 'minute')?.value || '0'),
  }
}

function overlapsBlock(window: PreviewWindow, block: PreviewExternalBlock): boolean {
  const startMs = zonedDateTimeToDate(window.date, window.start_time, PLATFORM_TIME_ZONE).getTime()
  const endMs = zonedDateTimeToDate(window.date, window.end_time, PLATFORM_TIME_ZONE).getTime()
  const blockStartMs = new Date(block.start_at).getTime()
  const blockEndMs = new Date(block.end_at).getTime()

  return startMs < blockEndMs && endMs > blockStartMs
}

function splitWindowByRanges(window: PreviewWindow, blocks: Array<{ start: number; end: number }>): PreviewWindow[] {
  if (blocks.length === 0) {
    return [window]
  }

  const sortedBlocks = [...blocks].sort((left, right) => left.start - right.start)
  const windowStart = toMinutes(window.start_time)
  const windowEnd = toMinutes(window.end_time)
  const remaining: Array<{ start: number; end: number }> = []
  let cursor = windowStart

  for (const block of sortedBlocks) {
    if (block.end <= cursor || block.start >= windowEnd) {
      continue
    }

    if (block.start > cursor) {
      remaining.push({
        start: cursor,
        end: Math.min(block.start, windowEnd),
      })
    }

    cursor = Math.max(cursor, block.end)
    if (cursor >= windowEnd) {
      break
    }
  }

  if (cursor < windowEnd) {
    remaining.push({ start: cursor, end: windowEnd })
  }

  return remaining
    .filter((range) => range.end > range.start)
    .map((range) => ({
      date: window.date,
      start_time: fromMinutes(range.start),
      end_time: fromMinutes(range.end),
    }))
}

function getBlockingRangesForDate(
  date: string,
  bookings: PreviewBookingWindow[],
  recurringBookings: PreviewBookingWindow[],
  externalBlocks: PreviewExternalBlock[]
): Array<{ start: number; end: number }> {
  const bookingRanges = [...bookings, ...recurringBookings]
    .filter((booking) => booking.date === date && (booking.status === 'pending' || booking.status === 'confirmed'))
    .map((booking) => ({
      start: toMinutes(booking.start_time),
      end: toMinutes(booking.end_time),
    }))

  const blockRanges = externalBlocks
    .filter((block) => block.status === 'active')
    .filter((block) => {
      const blockStart = new Date(block.start_at)
      const blockEnd = new Date(block.end_at)
      return getDateStringInTimeZone(blockStart, PLATFORM_TIME_ZONE) <= date
        && getDateStringInTimeZone(blockEnd, PLATFORM_TIME_ZONE) >= date
    })
    .map((block) => {
      const blockStart = new Date(block.start_at)
      const blockEnd = new Date(block.end_at)
      const sameStartDate = getDateStringInTimeZone(blockStart, PLATFORM_TIME_ZONE) === date
      const sameEndDate = getDateStringInTimeZone(blockEnd, PLATFORM_TIME_ZONE) === date
      const startParts = getTimePartsInTimeZone(blockStart, PLATFORM_TIME_ZONE)
      const endParts = getTimePartsInTimeZone(blockEnd, PLATFORM_TIME_ZONE)
      const start = sameStartDate
        ? startParts.hours * 60 + startParts.minutes
        : 0
      const end = sameEndDate
        ? endParts.hours * 60 + endParts.minutes
        : 24 * 60
      return { start, end }
    })

  return [...bookingRanges, ...blockRanges]
}

function getReasonChips(args: {
  date: string
  request: AdminVenueAvailabilityPreviewRequest
  privateBaseWindows: PreviewWindow[]
  dropInBaseWindows: PreviewWindow[]
  privateVisibleWindows: PreviewWindow[]
  dropInVisibleWindows: PreviewWindow[]
  bookings: PreviewBookingWindow[]
  recurringBookings: PreviewBookingWindow[]
  externalBlocks: PreviewExternalBlock[]
  now: Date
}): AdminVenueAvailabilityPreviewReason[] {
  const reasons: AdminVenueAvailabilityPreviewReason[] = []
  const hasAnyBaseWindows = args.privateBaseWindows.length > 0 || args.dropInBaseWindows.length > 0

  if (args.request.blackout_dates.includes(args.date)) {
    reasons.push('blackout')
  }
  if (args.request.holiday_dates.includes(args.date)) {
    reasons.push('holiday')
  }
  if (!hasAnyBaseWindows) {
    reasons.push('closed')
  }

  const privatePolicyFiltered = args.privateBaseWindows.some((window) => !isSlotAllowedByVenueConfig(window, {
    venue_id: 'preview',
    drop_in_enabled: args.request.drop_in_enabled,
    drop_in_price: args.request.drop_in_price,
    regular_schedule_mode: 'template',
    min_advance_booking_days: args.request.min_advance_booking_days,
    min_advance_lead_time_hours: args.request.min_advance_lead_time_hours,
    operating_hours: args.request.operating_hours,
    blackout_dates: args.request.blackout_dates,
    holiday_dates: args.request.holiday_dates,
    policy_cancel: null,
    policy_refund: null,
    policy_reschedule: null,
    policy_no_show: null,
    policy_operating_hours_notes: null,
    review_cadence_days: 30,
    last_reviewed_at: null,
    updated_by: null,
    created_at: null,
    updated_at: null,
  }, args.now))
  const dropInPolicyFiltered = args.dropInBaseWindows.some((window) => !isSlotAllowedByVenueConfig(window, {
    venue_id: 'preview',
    drop_in_enabled: args.request.drop_in_enabled,
    drop_in_price: args.request.drop_in_price,
    regular_schedule_mode: 'template',
    min_advance_booking_days: args.request.min_advance_booking_days,
    min_advance_lead_time_hours: args.request.min_advance_lead_time_hours,
    operating_hours: args.request.operating_hours,
    blackout_dates: args.request.blackout_dates,
    holiday_dates: args.request.holiday_dates,
    policy_cancel: null,
    policy_refund: null,
    policy_reschedule: null,
    policy_no_show: null,
    policy_operating_hours_notes: null,
    review_cadence_days: 30,
    last_reviewed_at: null,
    updated_by: null,
    created_at: null,
    updated_at: null,
  }, args.now))
  if (privatePolicyFiltered || dropInPolicyFiltered) {
    reasons.push('advance_notice')
  }

  const hasGoogleBlock = args.externalBlocks
    .filter((block) => block.status === 'active')
    .filter((block) => block.source === 'google_calendar')
    .some((block) =>
      [...args.privateBaseWindows, ...args.dropInBaseWindows].some((window) => overlapsBlock(window, block))
    )
  if (hasGoogleBlock) {
    reasons.push('google_blocked')
  }

  const hasBookingConflict = [...args.bookings, ...args.recurringBookings]
    .filter((booking) => booking.date === args.date && (booking.status === 'pending' || booking.status === 'confirmed'))
    .some((booking) =>
      args.privateBaseWindows.some((window) =>
        zonedDateTimeToDate(window.date, window.start_time, PLATFORM_TIME_ZONE).getTime()
          < zonedDateTimeToDate(booking.date, booking.end_time, PLATFORM_TIME_ZONE).getTime()
        && zonedDateTimeToDate(window.date, window.end_time, PLATFORM_TIME_ZONE).getTime()
          > zonedDateTimeToDate(booking.date, booking.start_time, PLATFORM_TIME_ZONE).getTime()
      )
    )
  if (hasBookingConflict) {
    reasons.push('fully_booked')
  }

  const precedence: AdminVenueAvailabilityPreviewReason[] = [
    'blackout',
    'holiday',
    'closed',
    'advance_notice',
    'google_blocked',
    'fully_booked',
  ]

  return precedence.filter((reason) => reasons.includes(reason)).slice(0, 2)
}

function buildPolicyConfig(request: AdminVenueAvailabilityPreviewRequest) {
  return {
    venue_id: 'preview',
    drop_in_enabled: request.drop_in_enabled,
    drop_in_price: request.drop_in_price,
    regular_schedule_mode: 'template' as const,
    min_advance_booking_days: request.min_advance_booking_days,
    min_advance_lead_time_hours: request.min_advance_lead_time_hours,
    operating_hours: request.operating_hours,
    blackout_dates: request.blackout_dates,
    holiday_dates: request.holiday_dates,
    policy_cancel: null,
    policy_refund: null,
    policy_reschedule: null,
    policy_no_show: null,
    policy_operating_hours_notes: null,
    review_cadence_days: 30,
    last_reviewed_at: null,
    updated_by: null,
    created_at: null,
    updated_at: null,
  }
}

function summarizePreviewDays(args: PreviewSummaryBuildArgs): AdminVenueAvailabilityPreviewDay[] {
  const privateTemplates = deriveRegularTemplateWindowsFromOperatingHours(args.request.operating_hours)
  const dropInTemplates = args.request.drop_in_enabled ? args.request.drop_in_templates : []

  return args.dateRange.map((date) => {
    const privateBaseWindows = expandWindowsForDate(date, privateTemplates)
    const dropInBaseWindows = expandWindowsForDate(date, dropInTemplates)
    const privateBooking = mergeAdjacentWindows(
      args.finalSlots.filter((slot) => slot.date === date && slot.kind === 'private_booking')
    )
    const dropIn = mergeAdjacentWindows(
      args.finalSlots.filter((slot) => slot.date === date && slot.kind === 'drop_in')
    )

    return {
      date,
      private_booking: privateBooking,
      drop_in: dropIn,
      reason_chips: getReasonChips({
        date,
        request: args.request,
        privateBaseWindows,
        dropInBaseWindows,
        privateVisibleWindows: privateBooking.map((window) => ({ date, ...window })),
        dropInVisibleWindows: dropIn.map((window) => ({ date, ...window })),
        bookings: args.bookings,
        recurringBookings: args.recurringBookings,
        externalBlocks: args.externalBlocks,
        now: args.now,
      }),
    }
  })
}

export function buildDraftAvailabilityPreviewDays(args: PreviewDayBuildArgs): AdminVenueAvailabilityPreviewDay[] {
  const policyConfig = buildPolicyConfig(args.request)
  const privateTemplates = deriveRegularTemplateWindowsFromOperatingHours(args.request.operating_hours)
  const dropInTemplates = args.request.drop_in_enabled ? args.request.drop_in_templates : []
  const draftSlots: PreviewWindow[] = []

  for (const date of args.dateRange) {
    const blockingRanges = getBlockingRangesForDate(date, args.bookings, args.recurringBookings, args.externalBlocks)
    const privateWindows = expandWindowsForDate(date, privateTemplates)
      .filter((window) => isSlotAllowedByVenueConfig(window, policyConfig, args.now))
      .flatMap((window) => splitWindowByRanges(window, blockingRanges).map((slot) => ({
        ...slot,
        kind: 'private_booking' as const,
      })))

    const dropInWindows = expandWindowsForDate(date, dropInTemplates)
      .filter((window) => isSlotAllowedByVenueConfig(window, policyConfig, args.now))
      .filter((window) => !args.externalBlocks.some((block) => block.status === 'active' && overlapsBlock(window, block)))
      .map((window) => ({
        ...window,
        kind: 'drop_in' as const,
      }))

    draftSlots.push(...privateWindows, ...dropInWindows)
  }

  return summarizePreviewDays({
    ...args,
    finalSlots: draftSlots,
  })
}

function mapLiveSlotsToPreviewWindows(slots: UnifiedAvailableSlot[]): PreviewWindow[] {
  return slots.map((slot) => ({
    date: slot.date,
    start_time: normalizeTime(slot.start_time),
    end_time: normalizeTime(slot.end_time),
    kind: slot.action_type === 'info_only_open_gym' ? 'drop_in' : 'private_booking',
  }))
}

function extractCurrentDropInTemplates(rows: Array<{
  action_type: SlotActionType
  day_of_week: number
  start_time: string
  end_time: string
}>): DropInTemplateWindow[] {
  return rows
    .filter((row) => row.action_type === 'info_only_open_gym')
    .map((row) => ({
      day_of_week: row.day_of_week,
      start_time: normalizeTime(row.start_time),
      end_time: normalizeTime(row.end_time),
    }))
    .sort((left, right) => {
      if (left.day_of_week !== right.day_of_week) {
        return left.day_of_week - right.day_of_week
      }
      if (left.start_time !== right.start_time) {
        return left.start_time.localeCompare(right.start_time)
      }
      return left.end_time.localeCompare(right.end_time)
    })
}

export function countChangedPreviewDays(
  livePreview: AdminVenueAvailabilityPreviewDay[],
  draftPreview: AdminVenueAvailabilityPreviewDay[]
): number {
  const maxLength = Math.max(livePreview.length, draftPreview.length)
  let changed = 0

  for (let index = 0; index < maxLength; index += 1) {
    if (JSON.stringify(livePreview[index] || null) !== JSON.stringify(draftPreview[index] || null)) {
      changed += 1
    }
  }

  return changed
}

export class AdminAvailabilityPreviewService {
  async getVenueAvailabilityPreview(args: {
    venueId: string
    request: AdminVenueAvailabilityPreviewRequest
    now?: Date
  }): Promise<{
    days: string[]
    live_preview: AdminVenueAvailabilityPreviewDay[]
    draft_preview: AdminVenueAvailabilityPreviewDay[]
    changed_day_count: number
    has_unpublished_changes: boolean
  }> {
    const adminClient = createAdminClient()
    const now = args.now || new Date()
    const dateRange = getNextSevenDates(now)
    const dateFrom = dateRange[0]
    const dateTo = dateRange[dateRange.length - 1]
    const normalizedRequest = normalizePreviewRequest(args.request)

    const [
      { data: venue, error: venueError },
      { data: configRow, error: configError },
      { data: templateRows, error: templateError },
      { data: bookingRows, error: bookingError },
      { data: recurringRows, error: recurringError },
      externalBlocksResult,
    ] = await Promise.all([
      adminClient.from('venues').select('id, instant_booking').eq('id', args.venueId).maybeSingle(),
      adminClient.from('venue_admin_configs').select('*').eq('venue_id', args.venueId).maybeSingle(),
      adminClient
        .from('slot_templates')
        .select('action_type, day_of_week, start_time, end_time')
        .eq('venue_id', args.venueId)
        .eq('is_active', true),
      adminClient
        .from('bookings')
        .select('venue_id, date, start_time, end_time, status')
        .eq('venue_id', args.venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),
      adminClient
        .from('recurring_bookings')
        .select('venue_id, date, start_time, end_time, status')
        .eq('venue_id', args.venueId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('status', ['pending', 'confirmed']),
      adminClient
        .from('external_availability_blocks')
        .select('start_at, end_at, source, status')
        .eq('venue_id', args.venueId)
        .eq('status', 'active'),
    ])

    if (venueError) {
      throw badRequest(`Failed to load venue for preview: ${venueError.message}`)
    }
    if (!venue) {
      throw notFound('Venue not found')
    }
    if (configError) {
      throw badRequest(`Failed to load venue config for preview: ${configError.message}`)
    }
    if (templateError) {
      throw badRequest(`Failed to load slot templates for preview: ${templateError.message}`)
    }
    if (bookingError) {
      throw badRequest(`Failed to load bookings for preview: ${bookingError.message}`)
    }
    if (recurringError) {
      throw badRequest(`Failed to load recurring bookings for preview: ${recurringError.message}`)
    }
    const isMissingExternalBlocksTable = externalBlocksResult.error?.code === '42P01'
      || externalBlocksResult.error?.message?.toLowerCase().includes('external_availability_blocks')
    if (externalBlocksResult.error && !isMissingExternalBlocksTable) {
      throw badRequest(`Failed to load external availability blocks for preview: ${externalBlocksResult.error.message}`)
    }

    const currentConfig = normalizeVenueAdminConfig(args.venueId, (configRow as Record<string, unknown> | null) || null)
    const currentDropInTemplates = extractCurrentDropInTemplates(
      ((templateRows || []) as Array<{
        action_type: SlotActionType
        day_of_week: number
        start_time: string
        end_time: string
      }>)
    )

    const liveRequest = buildComparisonRequest({
      venueId: args.venueId,
      currentConfig,
      currentDropInTemplates,
      instantBooking: Boolean((venue as { instant_booking?: boolean }).instant_booking),
    })
    const hasUnpublishedChanges = JSON.stringify(liveRequest) !== JSON.stringify(normalizedRequest)

    const availabilityService = new AvailabilityService()
    const liveSlots = await availabilityService.getAvailableSlots(args.venueId, dateFrom, dateTo)
    const previewBookings = ((bookingRows || []) as PreviewBookingWindow[])
    const previewRecurring = ((recurringRows || []) as PreviewBookingWindow[])
    const previewExternalBlocks = isMissingExternalBlocksTable
      ? []
      : ((externalBlocksResult.data || []) as PreviewExternalBlock[])

    const livePreview = summarizePreviewDays({
      dateRange,
      request: liveRequest,
      now,
      bookings: previewBookings,
      recurringBookings: previewRecurring,
      externalBlocks: previewExternalBlocks,
      finalSlots: mapLiveSlotsToPreviewWindows(liveSlots),
    })

    const draftPreview = buildDraftAvailabilityPreviewDays({
      dateRange,
      request: normalizedRequest,
      now,
      bookings: previewBookings,
      recurringBookings: previewRecurring,
      externalBlocks: previewExternalBlocks,
    })

    return {
      days: dateRange,
      live_preview: livePreview,
      draft_preview: draftPreview,
      changed_day_count: countChangedPreviewDays(livePreview, draftPreview),
      has_unpublished_changes: hasUnpublishedChanges,
    }
  }
}
