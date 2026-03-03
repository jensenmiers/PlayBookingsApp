import { AvailabilityService } from '../availabilityService'

const mockCreateClient = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

type QueryPayload = {
  data: unknown
  error: { message: string; code?: string } | null
}

function createQuery(payload: QueryPayload) {
  const builder: Record<string, (...args: unknown[]) => unknown> = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    in: () => builder,
    order: () => builder,
    maybeSingle: async () => ({ data: payload.data, error: payload.error }),
    single: async () => ({ data: payload.data, error: payload.error }),
    then: (resolve: (value: QueryPayload) => unknown) => Promise.resolve(resolve(payload)),
  }
  return builder
}

describe('AvailabilityService (template-only slots)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns regular and drop-in slots from slot_instances without querying availability table', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-22T10:00:00.000-08:00'))

    try {
      const rpc = jest.fn(async (fnName: string, args: Record<string, unknown>) => {
        if (fnName !== 'get_regular_available_slot_instances') {
          throw new Error(`Unexpected rpc call: ${fnName}`)
        }
        expect(args).toEqual({
          p_venue_id: 'venue-1',
          p_date_from: '2026-02-23',
          p_date_to: '2026-02-23',
          p_date_filter: null,
        })
        return {
          data: [
            {
              venue_id: 'venue-1',
              slot_id: 'slot-regular',
              slot_date: '2026-02-23',
              start_time: '17:00:00',
              end_time: '18:00:00',
              action_type: 'instant_book',
            },
          ],
          error: null,
        }
      })

      const from = jest.fn((table: string) => {
        if (table === 'venues') {
          return createQuery({
            data: { instant_booking: true },
            error: null,
          })
        }
        if (table === 'venue_admin_configs') {
          return createQuery({
            data: {
              venue_id: 'venue-1',
              drop_in_enabled: true,
              drop_in_price: 7,
              regular_schedule_mode: 'template',
            },
            error: null,
          })
        }
        if (table === 'slot_instances') {
          return createQuery({
            data: [
              {
                id: 'slot-drop-in',
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
                body: 'Drop-in open gym',
                bullet_points: ['No reservation required.'],
                cta_label: 'Got it',
              },
            ],
            error: null,
          })
        }
        if (table === 'external_availability_blocks') {
          return createQuery({ data: [], error: null })
        }
        throw new Error(`Unexpected table query: ${table}`)
      })

      mockCreateClient.mockResolvedValue({ from, rpc })

      const service = new AvailabilityService()
      const result = await service.getAvailableSlots('venue-1', '2026-02-23', '2026-02-23')

      expect(result).toEqual([
        {
          date: '2026-02-23',
          start_time: '12:00:00',
          end_time: '13:00:00',
          venue_id: 'venue-1',
          availability_id: null,
          slot_instance_id: 'slot-drop-in',
          action_type: 'info_only_open_gym',
          modal_content: {
            title: 'Open Gym Session',
            body: 'Drop-in open gym',
            bullet_points: ['No reservation required.'],
            cta_label: 'Got it',
          },
          slot_pricing: {
            amount_cents: 700,
            currency: 'usd',
            unit: 'person',
            payment_method: 'on_site',
          },
        },
        {
          date: '2026-02-23',
          start_time: '17:00:00',
          end_time: '18:00:00',
          venue_id: 'venue-1',
          availability_id: null,
          slot_instance_id: 'slot-regular',
          action_type: 'instant_book',
          modal_content: null,
          slot_pricing: null,
        },
      ])

      expect(rpc).toHaveBeenCalledWith('get_regular_available_slot_instances', {
        p_venue_id: 'venue-1',
        p_date_from: '2026-02-23',
        p_date_to: '2026-02-23',
        p_date_filter: null,
      })
      expect(from).not.toHaveBeenCalledWith('bookings')
      expect(from).not.toHaveBeenCalledWith('recurring_bookings')
      expect(from).not.toHaveBeenCalledWith('availability')
    } finally {
      jest.useRealTimers()
    }
  })

  it('returns only future info-only slots for same-day availability', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-23T13:30:00.000-08:00'))

    try {
      const rpc = jest.fn(async () => ({
        data: [
          {
            venue_id: 'venue-1',
            slot_id: 'slot-regular',
            slot_date: '2026-02-23',
            start_time: '20:00:00',
            end_time: '21:00:00',
            action_type: 'instant_book',
          },
        ],
        error: null,
      }))

      const from = jest.fn((table: string) => {
        if (table === 'venues') {
          return createQuery({
            data: { instant_booking: true },
            error: null,
          })
        }
        if (table === 'venue_admin_configs') {
          return createQuery({
            data: {
              venue_id: 'venue-1',
              drop_in_enabled: true,
              drop_in_price: 7,
              regular_schedule_mode: 'template',
            },
            error: null,
          })
        }
        if (table === 'slot_instances') {
          return createQuery({
            data: [
              {
                id: 'slot-drop-in-past',
                venue_id: 'venue-1',
                date: '2026-02-23',
                start_time: '12:00:00',
                end_time: '13:00:00',
                action_type: 'info_only_open_gym',
                blocks_inventory: true,
              },
              {
                id: 'slot-drop-in-future',
                venue_id: 'venue-1',
                date: '2026-02-23',
                start_time: '14:00:00',
                end_time: '15:00:00',
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
                body: 'Drop-in open gym',
                bullet_points: ['No reservation required.'],
                cta_label: 'Got it',
              },
            ],
            error: null,
          })
        }
        if (table === 'external_availability_blocks') {
          return createQuery({ data: [], error: null })
        }
        throw new Error(`Unexpected table query: ${table}`)
      })

      mockCreateClient.mockResolvedValue({ from, rpc })

      const service = new AvailabilityService()
      const result = await service.getAvailableSlots('venue-1', '2026-02-23', '2026-02-23')

      expect(result).toEqual([
        {
          date: '2026-02-23',
          start_time: '14:00:00',
          end_time: '15:00:00',
          venue_id: 'venue-1',
          availability_id: null,
          slot_instance_id: 'slot-drop-in-future',
          action_type: 'info_only_open_gym',
          modal_content: {
            title: 'Open Gym Session',
            body: 'Drop-in open gym',
            bullet_points: ['No reservation required.'],
            cta_label: 'Got it',
          },
          slot_pricing: {
            amount_cents: 700,
            currency: 'usd',
            unit: 'person',
            payment_method: 'on_site',
          },
        },
        {
          date: '2026-02-23',
          start_time: '20:00:00',
          end_time: '21:00:00',
          venue_id: 'venue-1',
          availability_id: null,
          slot_instance_id: 'slot-regular',
          action_type: 'instant_book',
          modal_content: null,
          slot_pricing: null,
        },
      ])
    } finally {
      jest.useRealTimers()
    }
  })

  it('hides drop-in slots when drop-in is disabled', async () => {
    const rpc = jest.fn(async () => ({
      data: [
        {
          venue_id: 'venue-1',
          slot_id: 'slot-regular',
          slot_date: '2026-02-23',
          start_time: '17:00:00',
          end_time: '18:00:00',
          action_type: 'request_private',
        },
      ],
      error: null,
    }))

    const from = jest.fn((table: string) => {
      if (table === 'venues') {
        return createQuery({
          data: { instant_booking: false },
          error: null,
        })
      }
      if (table === 'venue_admin_configs') {
        return createQuery({
          data: {
            venue_id: 'venue-1',
            drop_in_enabled: false,
            drop_in_price: 7,
            regular_schedule_mode: 'template',
          },
          error: null,
        })
      }
      if (table === 'slot_instances') {
        return createQuery({
          data: [
            {
              id: 'slot-drop-in',
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
        return createQuery({ data: [], error: null })
      }
      if (table === 'external_availability_blocks') {
        return createQuery({ data: [], error: null })
      }
      throw new Error(`Unexpected table query: ${table}`)
    })

    mockCreateClient.mockResolvedValue({ from, rpc })

    const service = new AvailabilityService()
    const result = await service.getAvailableSlots('venue-1', '2026-02-23', '2026-02-23')

    expect(result).toEqual([
      {
        date: '2026-02-23',
        start_time: '17:00:00',
        end_time: '18:00:00',
        venue_id: 'venue-1',
        availability_id: null,
        slot_instance_id: 'slot-regular',
        action_type: 'request_private',
        modal_content: null,
        slot_pricing: null,
      },
    ])
    expect(rpc).toHaveBeenCalledWith('get_regular_available_slot_instances', {
      p_venue_id: 'venue-1',
      p_date_from: '2026-02-23',
      p_date_to: '2026-02-23',
      p_date_filter: null,
    })
  })

  it('filters out slots blocked by external availability blocks', async () => {
    const rpc = jest.fn(async () => ({
      data: [
        {
          venue_id: 'venue-1',
          slot_id: 'slot-open',
          slot_date: '2026-02-23',
          start_time: '18:00:00',
          end_time: '19:00:00',
          action_type: 'instant_book',
        },
      ],
      error: null,
    }))

    const from = jest.fn((table: string) => {
      if (table === 'venues') {
        return createQuery({
          data: { instant_booking: true },
          error: null,
        })
      }
      if (table === 'venue_admin_configs') {
        return createQuery({
          data: {
            venue_id: 'venue-1',
            drop_in_enabled: false,
            drop_in_price: null,
            regular_schedule_mode: 'template',
          },
          error: null,
        })
      }
      if (table === 'slot_instances') {
        return createQuery({
          data: [],
          error: null,
        })
      }
      if (table === 'slot_modal_content') {
        return createQuery({ data: [], error: null })
      }
      if (table === 'external_availability_blocks') {
        return createQuery({ data: [], error: null })
      }
      throw new Error(`Unexpected table query: ${table}`)
    })

    mockCreateClient.mockResolvedValue({ from, rpc })

    const service = new AvailabilityService()
    const result = await service.getAvailableSlots('venue-1', '2026-02-23', '2026-02-23')

    expect(result).toEqual([
      {
        date: '2026-02-23',
        start_time: '18:00:00',
        end_time: '19:00:00',
        venue_id: 'venue-1',
        availability_id: null,
        slot_instance_id: 'slot-open',
        action_type: 'instant_book',
        modal_content: null,
        slot_pricing: null,
      },
    ])
    expect(rpc).toHaveBeenCalledWith('get_regular_available_slot_instances', {
      p_venue_id: 'venue-1',
      p_date_from: '2026-02-23',
      p_date_to: '2026-02-23',
      p_date_filter: null,
    })
  })
})
