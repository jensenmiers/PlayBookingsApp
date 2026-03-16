import { render, screen } from '@testing-library/react'
import type { AvailabilityWithVenue } from '@/types'
import { AvailabilityCard } from '@/components/search/availability-card'

jest.mock('@/components/forms/create-booking-form', () => ({
  CreateBookingForm: ({
    venueId,
    initialStartTime,
    initialEndTime,
    initialNotes,
  }: {
    venueId: string
    initialStartTime?: string
    initialEndTime?: string
    initialNotes?: string
  }) => (
    <div data-testid="resume-booking-form">
      {venueId}:{initialStartTime}:{initialEndTime}:{initialNotes}
    </div>
  ),
}))

describe('AvailabilityCard auth resume', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/search?date=2026-03-16#calendar')
  })

  it('reopens a resumed booking form on the stored returnTo page', () => {
    window.sessionStorage.setItem(
      'play-bookings-auth-resume',
      JSON.stringify({
        returnTo: '/search?date=2026-03-16#calendar',
        resumeState: {
          type: 'create-booking-form',
          venueId: 'venue-1',
          date: '2026-03-20',
          startTime: '18:00:00',
          endTime: '20:00:00',
          recurringType: 'none',
          notes: 'Bring a ball',
        },
      })
    )

    render(
      <AvailabilityCard
        availability={{
          id: 'availability-1',
          venue_id: 'venue-1',
          date: '2026-03-20',
          start_time: '18:00:00',
          end_time: '20:00:00',
          is_available: true,
          created_at: '2026-03-16T00:00:00Z',
          updated_at: '2026-03-16T00:00:00Z',
          venue: {
            id: 'venue-1',
            name: 'Memorial Park',
            city: 'Santa Monica',
            state: 'CA',
            hourly_rate: 75,
          },
        } as AvailabilityWithVenue}
      />
    )

    expect(screen.getByTestId('resume-booking-form')).toHaveTextContent(
      'venue-1:18:00:00:20:00:00:Bring a ball'
    )
  })
})
