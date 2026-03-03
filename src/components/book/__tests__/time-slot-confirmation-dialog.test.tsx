import { render, screen } from '@testing-library/react'
import { TimeSlotConfirmationDialog } from '@/components/book/time-slot-confirmation-dialog'
import type { Venue } from '@/types'

function createVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    name: 'Crosscourt',
    description: 'Indoor court',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
    owner_id: 'owner-1',
    hourly_rate: 95,
    instant_booking: false,
    insurance_required: false,
    max_advance_booking_days: 180,
    photos: [],
    amenities: [],
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TimeSlotConfirmationDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    date: new Date('2026-02-10T00:00:00'),
    timeSlot: {
      start: '12:00:00',
      end: '13:00:00',
      display: '12:00 PM',
    },
    onConfirm: jest.fn(),
  }

  it('shows host approval messaging for non-instant venues', () => {
    render(
      <TimeSlotConfirmationDialog
        {...baseProps}
        venue={createVenue({ instant_booking: false })}
      />
    )

    expect(screen.getByText('Host Approval:')).toBeInTheDocument()
    expect(screen.getByText(/requires host approval/i)).toBeInTheDocument()
  })

  it('does not show host approval messaging for instant venues', () => {
    render(
      <TimeSlotConfirmationDialog
        {...baseProps}
        venue={createVenue({ instant_booking: true })}
      />
    )

    expect(screen.queryByText('Host Approval:')).not.toBeInTheDocument()
  })
})
