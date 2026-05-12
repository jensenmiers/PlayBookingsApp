import { buildVenueFaqs } from '@/lib/venueFaqs'
import type { Venue } from '@/types'

const createMockVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 'venue-1',
  name: 'Memorial Park',
  description: 'Community court',
  address: '1401 Olympic Blvd',
  city: 'Santa Monica',
  state: 'CA',
  zip_code: '90404',
  owner_id: 'owner-1',
  hourly_rate: 75,
  instant_booking: false,
  insurance_required: false,
  max_advance_booking_days: 30,
  photos: ['https://example.com/photo.jpg'],
  amenities: ['Indoor Court'],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('buildVenueFaqs', () => {
  it('communicates required insurance and certificate-of-insurance expectations', () => {
    const faqs = buildVenueFaqs(createMockVenue({ insurance_required: true }))

    expect(faqs).toContainEqual(expect.objectContaining({
      group: 'Policies',
      q: 'Is insurance required?',
      a: expect.stringMatching(/certificate of insurance/i),
    }))
  })

  it('communicates minimum notice instead of legacy max advance booking copy', () => {
    const faqs = buildVenueFaqs(
      createMockVenue({
        booking_mode: 'request_to_book',
        max_advance_booking_days: 30,
      }),
      {
        min_advance_booking_days: 0,
        min_advance_lead_time_hours: 24,
      }
    )

    expect(faqs).toContainEqual(expect.objectContaining({
      group: 'Booking',
      q: 'How much notice do I need?',
      a: 'Request at least 24 hours ahead. Minimum notice before start time.',
    }))
    expect(faqs).not.toContainEqual(expect.objectContaining({
      a: 'You can book up to 30 days in advance.',
    }))
  })
})
