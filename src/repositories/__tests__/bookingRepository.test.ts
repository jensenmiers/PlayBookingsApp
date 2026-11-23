import { BookingRepository } from '../bookingRepository'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

function mockBookingsQuery(rows: unknown[]) {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  ;(createClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(query) })
}

describe('BookingRepository.findByRenterWithVenue', () => {
  it('keeps bookings whose venue is hidden from the renter (inactive venues are not readable)', async () => {
    mockBookingsQuery([
      { id: 'booking-hidden', venue_id: 'venue-old', venue: null },
      {
        id: 'booking-visible',
        venue_id: 'venue-1',
        venue: { id: 'venue-1', name: 'Church Gym', photos: [], venue_media: [] },
      },
    ])

    const bookings = await new BookingRepository().findByRenterWithVenue('user-1')

    expect(bookings.map((booking) => booking.id)).toEqual(['booking-hidden', 'booking-visible'])
    expect(bookings[0].venue).toBeNull()
    expect(bookings[1].venue?.name).toBe('Church Gym')
  })
})
