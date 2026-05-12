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
})
