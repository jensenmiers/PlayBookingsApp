import { fireEvent, render, screen, within } from '@testing-library/react'
import { VenueAvailabilityCalendar } from '../venue-availability-calendar'
import type { ComputedAvailabilitySlot } from '@/hooks/useVenues'
import type { Venue } from '@/types'

const slots: ComputedAvailabilitySlot[] = [17, 18, 19].map(hour => ({
  venue_id: 'v', date: '2026-09-06', start_time: `${hour}:00:00`, end_time: `${hour + 1}:00:00`, action_type: 'request_private',
}))
const props = {
  venue: { id: 'v', name: 'Test court', hourly_rate: 75, booking_mode: 'approval_slots' } as Venue,
  startDate: '2026-09-04', today: '2026-09-04', now: new Date('2026-09-04T22:00:00Z'),
  slots, loading: false, error: null, onStartDateChange: jest.fn(), onSelect: jest.fn(), onRetry: jest.fn(),
  policy: { min_advance_lead_time_hours: 48 },
}

beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(props.now) })
afterEach(() => jest.useRealTimers())

it('shows a seven-day timeline, hard notice cutoff and continuous window', () => {
  render(<VenueAvailabilityCalendar {...props} />)
  expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /View .*September/ })).toHaveLength(7)
  expect(screen.getByText('7 AM')).toBeInTheDocument()
  expect(screen.getByText('10 PM')).toBeInTheDocument()
  expect(screen.getByText(/Requires 48 hours/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Private rental.*September 6.*5:00 PM.*8:00 PM/ })).toBeInTheDocument()
})

it('navigates by seven days, resets to today and jumps to a date', () => {
  render(<VenueAvailabilityCalendar {...props} />)
  expect(screen.getByRole('button', { name: 'Previous seven days' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Next seven days' }))
  expect(props.onStartDateChange).toHaveBeenLastCalledWith('2026-09-11')
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(props.onStartDateChange).toHaveBeenLastCalledWith('2026-09-04')
  fireEvent.change(screen.getByLabelText('Jump to date'), { target: { value: '2026-10-12' } })
  expect(props.onStartDateChange).toHaveBeenLastCalledWith('2026-10-12')
})

it('offers only published start/duration pairs and passes the original slot into booking', () => {
  render(<VenueAvailabilityCalendar {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /Private rental.*September 6.*5:00 PM.*8:00 PM/ }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '18:00:00' } })
  expect(within(dialog).getByLabelText('Duration').querySelectorAll('option')).toHaveLength(1)
  expect(within(dialog).getByText('1 hour')).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to booking' }))
  expect(props.onSelect).toHaveBeenCalledWith(slots[1])
})

it('keeps open gym selectable inside rental notice and exposes outside-hours sessions', () => {
  render(<VenueAvailabilityCalendar {...props} slots={[{ ...slots[0], date: '2026-09-05', start_time: '06:00:00', end_time: '07:00:00', action_type: 'info_only_open_gym' }]} />)
  fireEvent.click(screen.getByText(/Additional times outside/))
  fireEvent.click(screen.getByRole('button', { name: /Open gym.*September 5.*6:00 AM/ }))
  expect(props.onSelect).toHaveBeenCalledWith(expect.objectContaining({ action_type: 'info_only_open_gym' }))
})

it('renders distinct loading, error and empty states without selectable stale inventory', () => {
  const { rerender } = render(<VenueAvailabilityCalendar {...props} loading />)
  expect(screen.getByText('Loading availability…')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Private rental.*September 6/ })).not.toBeInTheDocument()
  rerender(<VenueAvailabilityCalendar {...props} error="Network error" />)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(props.onRetry).toHaveBeenCalled()
  rerender(<VenueAvailabilityCalendar {...props} slots={[]} />)
  expect(screen.getByText('No published availability for these dates.')).toBeInTheDocument()
})

it('explains dates beyond the published horizon', () => {
  render(<VenueAvailabilityCalendar {...props} slots={[]} publishedThrough="2026-08-31" />)
  expect(screen.getByText('The schedule has not been published for these dates yet.')).toBeInTheDocument()
})

it('rechecks the hard cutoff when continuing after leaving the picker open', () => {
  render(<VenueAvailabilityCalendar {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /Private rental.*September 6.*5:00 PM.*8:00 PM/ }))
  jest.setSystemTime(new Date('2026-09-05T00:00:01Z'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue to booking' }))
  expect(props.onSelect).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('no longer meets the required notice')
})

it('disables a selected window if refreshed availability removes it', () => {
  const { rerender } = render(<VenueAvailabilityCalendar {...props} />)
  fireEvent.click(screen.getByRole('button', { name: /Private rental.*September 6.*5:00 PM.*8:00 PM/ }))
  rerender(<VenueAvailabilityCalendar {...props} slots={[]} />)
  expect(screen.getByRole('button', { name: 'Continue to booking' })).toBeDisabled()
})

it('shows one continuous orange session and selects its full range with first-hour details', () => {
  const gymSlots: ComputedAvailabilitySlot[] = slots.map((slot, index) => ({
    ...slot, action_type: 'info_only_open_gym', slot_instance_id: `gym-${index}`,
    modal_content: { title: `Session ${index}`, body: `Details ${index}` },
    slot_pricing: { amount_cents: 300 + index * 100, currency: 'USD', unit: 'person', payment_method: 'on_site' },
  }))
  render(<VenueAvailabilityCalendar {...props} slots={gymSlots} />)
  const block = screen.getByRole('button', { name: /Open gym.*September 6.*5:00 PM.*8:00 PM/ })
  expect(screen.getAllByRole('button', { name: /Open gym.*September 6/ })).toHaveLength(1)
  expect(block).toHaveClass('bg-accent-400/20')
  fireEvent.click(block)
  expect(props.onSelect).toHaveBeenCalledWith({ ...gymSlots[0], end_time: '20:00:00' })
})

it('keeps the two availability legend labels without the unfilled-time callout', () => {
  render(<VenueAvailabilityCalendar {...props} />)
  expect(screen.getByText('Private rental')).toBeInTheDocument()
  expect(screen.getByText('Open gym')).toBeInTheDocument()
  expect(screen.queryByText('Unfilled time: no published availability')).not.toBeInTheDocument()
})

it('uses compact day headers and time ranges while retaining precise accessible labels', () => {
  render(<VenueAvailabilityCalendar {...props} slots={[
    { ...slots[0], start_time: '11:30:00', end_time: '13:00:00', action_type: 'info_only_open_gym' },
    { ...slots[0], start_time: '14:00:00', end_time: '17:00:00', action_type: 'info_only_open_gym' },
  ]} />)
  expect(screen.queryByText('Find your court time')).not.toBeInTheDocument()
  expect(screen.getByText('Fri Sep 4')).toBeInTheDocument()
  expect(screen.getByText('2–5 PM')).toBeInTheDocument()
  expect(screen.getByText('11:30 AM–1 PM')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Open gym.*11:30 AM.*1:00 PM/ })).toBeInTheDocument()
})
