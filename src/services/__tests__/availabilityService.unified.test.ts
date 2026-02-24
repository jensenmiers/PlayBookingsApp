import { AvailabilityService } from '../availabilityService'

const mockCreateClient = jest.fn()
const mockComputeAvailableSlots = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

jest.mock('@/utils/slotSplitting', () => ({
  computeAvailableSlots: (...args: unknown[]) => mockComputeAvailableSlots(...args),
}))

type QueryPayload = {
  data: unknown
  error: { message: string } | null
}

function createQuery(payload: QueryPayload) {
  const builder: Record<string, (...args: unknown[]) => unknown> = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    in: () => builder,
    order: () => builder,
    single: async () => ({ data: payload.data, error: payload.error }),
    then: (resolve: (value: QueryPayload) => unknown) => Promise.resolve(resolve(payload)),
  }
  return builder
}

describe('AvailabilityService (unified slots)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns info-only slots with modal content and removes overlapping regular slots when blocking', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'venues') {
        return createQuery({
          data: { instant_booking: false },
          error: null,
        })
      }
      if (table === 'availability') {
        return createQuery({ data: [], error: null })
      }
      if (table === 'bookings') {
        return createQuery({ data: [], error: null })
      }
      if (table === 'recurring_bookings') {
        return createQuery({ data: [], error: null })
      }
      if (table === 'slot_instances') {
        return createQuery({
          data: [
            {
              id: 'slot-1',
              venue_id: 'venue-1',
              date: '2026-02-23',
              start_time: '12:00:00',
              end_time: '13:00:00',
              action_type: 'info_only_open_gym',
              blocks_inventory: true,
            },
          ],
          error: null,
        })
      }
      if (table === 'slot_modal_content') {
        return createQuery({
          data: [
            {
              action_type: 'info_only_open_gym',
              title: 'Open Gym Session',
              body: 'This session is a drop-in open gym. Payment is done on site.',
              bullet_points: [
                'No reservation required.',
                'Court activity is basketball only during these hours.',
              ],
              cta_label: 'Got it',
            },
          ],
          error: null,
        })
      }
      if (table === 'slot_instance_pricing') {
        return createQuery({
          data: [
            {
              slot_instance_id: 'slot-1',
              amount_cents: 500,
              currency: 'USD',
              unit: 'person',
              payment_method: 'on_site',
            },
          ],
          error: null,
        })
      }
      throw new Error(`Unexpected table query: ${table}`)
    })

    mockCreateClient.mockResolvedValue({ from })
    mockComputeAvailableSlots.mockReturnValue([
      {
        date: '2026-02-23',
        start_time: '12:00:00',
        end_time: '13:00:00',
        venue_id: 'venue-1',
        availability_id: 'availability-1',
      },
    ])

    const service = new AvailabilityService()
    const result = await service.getAvailableSlots('venue-1', '2026-02-23', '2026-02-23')

    expect(result).toEqual([
      {
        date: '2026-02-23',
        start_time: '12:00:00',
        end_time: '13:00:00',
        venue_id: 'venue-1',
        availability_id: null,
        slot_instance_id: 'slot-1',
        action_type: 'info_only_open_gym',
        modal_content: {
          title: 'Open Gym Session',
          body: 'This session is a drop-in open gym. Payment is done on site.',
          bullet_points: ['No reservation required.'],
          cta_label: 'Got it',
        },
        slot_pricing: {
          amount_cents: 500,
          currency: 'USD',
          unit: 'person',
          payment_method: 'on_site',
        },
      },
    ])
  })
})
