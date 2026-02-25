import {
  calculateVenueConfigCompleteness,
  getBookingPolicyViolation,
  normalizeVenueAdminConfig,
} from '@/lib/venueAdminConfig'
import type { Venue } from '@/types'

describe('normalizeVenueAdminConfig', () => {
  it('keeps a positive drop-in price', () => {
    const config = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: 25,
    })

    expect(config.drop_in_enabled).toBe(true)
    expect(config.drop_in_price).toBe(25)
  })

  it('normalizes missing or non-positive drop-in price to null', () => {
    const nullPriceConfig = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: null,
    })
    const zeroPriceConfig = normalizeVenueAdminConfig('venue-1', {
      drop_in_enabled: true,
      drop_in_price: 0,
    })

    expect(nullPriceConfig.drop_in_price).toBeNull()
    expect(zeroPriceConfig.drop_in_price).toBeNull()
  })

  it('preserves new free-form policy fields', () => {
    const config = normalizeVenueAdminConfig('venue-1', {
      policy_refund: 'No refunds after game start.',
      policy_operating_hours_notes: 'Open daily; call host for holiday schedules.',
    })

    expect(config.policy_refund).toBe('No refunds after game start.')
    expect(config.policy_operating_hours_notes).toBe('Open daily; call host for holiday schedules.')
  })
})

describe('venue admin policy enforcement', () => {
  it('does not block bookings based on operating_hours windows', () => {
    const config = normalizeVenueAdminConfig('venue-1', {
      min_advance_lead_time_hours: 0,
      same_day_cutoff_time: null,
      blackout_dates: [],
      holiday_dates: [],
      operating_hours: [{ day_of_week: 4, start_time: '09:00:00', end_time: '17:00:00' }],
    })

    const violation = getBookingPolicyViolation(
      {
        date: '2026-02-26',
        start_time: '18:00:00',
        end_time: '19:00:00',
      },
      config,
      new Date(2026, 1, 25, 10, 0, 0)
    )

    expect(violation).toBeNull()
  })
})

describe('calculateVenueConfigCompleteness', () => {
  it('does not require review cadence or operating hours fields', () => {
    const venue: Venue = {
      id: 'venue-1',
      name: 'Venue',
      description: 'Desc',
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90001',
      owner_id: 'owner-1',
      hourly_rate: 125,
      instant_booking: true,
      insurance_required: false,
      max_advance_booking_days: 30,
      photos: [],
      amenities: ['Parking'],
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }

    const config = normalizeVenueAdminConfig('venue-1', {
      min_advance_lead_time_hours: 0,
      same_day_cutoff_time: '12:00:00',
      insurance_document_types: [],
      operating_hours: [],
      review_cadence_days: 30,
      last_reviewed_at: null,
    })

    const completeness = calculateVenueConfigCompleteness(venue, config)

    expect(completeness.missing_fields).not.toContain('operating_hours')
    expect(completeness.missing_fields).not.toContain('review_cadence_days')
    expect(completeness.missing_fields).not.toContain('last_reviewed_at')
  })
})
