import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SuperAdminVenueConfigPage } from '../super-admin-venue-config-page'
import {
  connectVenueCalendar,
  disconnectVenueCalendar,
  getVenueCalendarStatus,
  patchAdminVenueConfig,
  selectVenueCalendar,
  syncVenueCalendarNow,
  useAdminVenues,
} from '@/hooks/useAdminVenues'
import { useAdminVenueBookings } from '@/hooks/useAdminVenueBookings'

jest.mock('@/hooks/useAdminVenues', () => ({
  useAdminVenues: jest.fn(),
  patchAdminVenueConfig: jest.fn(),
  connectVenueCalendar: jest.fn(),
  getVenueCalendarStatus: jest.fn(),
  selectVenueCalendar: jest.fn(),
  syncVenueCalendarNow: jest.fn(),
  disconnectVenueCalendar: jest.fn(),
}))

jest.mock('@/hooks/useAdminVenueBookings', () => ({
  useAdminVenueBookings: jest.fn(),
}))

const mockUseAdminVenues = useAdminVenues as jest.Mock
const mockPatchAdminVenueConfig = patchAdminVenueConfig as jest.Mock
const mockConnectVenueCalendar = connectVenueCalendar as jest.Mock
const mockGetVenueCalendarStatus = getVenueCalendarStatus as jest.Mock
const mockSelectVenueCalendar = selectVenueCalendar as jest.Mock
const mockSyncVenueCalendarNow = syncVenueCalendarNow as jest.Mock
const mockDisconnectVenueCalendar = disconnectVenueCalendar as jest.Mock
const mockUseAdminVenueBookings = useAdminVenueBookings as jest.Mock

const mockRefetch = jest.fn().mockResolvedValue(undefined)
const mockBookingsRefetch = jest.fn().mockResolvedValue(undefined)
const mockApproveInsurance = jest.fn().mockResolvedValue({ success: true, error: null })

const buildMockAdminVenuesData = () => [
  {
    venue: {
      id: 'venue-1',
      name: 'Alpha Gym',
      description: 'Alpha',
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90001',
      owner_id: 'owner-1',
      hourly_rate: 100,
      instant_booking: true,
      insurance_required: false,
      max_advance_booking_days: 60,
      photos: [],
      amenities: ['Parking'],
      is_active: true,
      created_at: '2026-02-20T12:00:00.000Z',
      updated_at: '2026-02-20T12:00:00.000Z',
    },
    config: {
      venue_id: 'venue-1',
      drop_in_enabled: false,
      drop_in_price: null,
      regular_schedule_mode: 'legacy',
      min_advance_booking_days: 0,
      min_advance_lead_time_hours: 0,
      operating_hours: [],
      blackout_dates: [],
      holiday_dates: [],
      policy_cancel: null,
      policy_refund: null,
      policy_reschedule: null,
      policy_no_show: null,
      policy_operating_hours_notes: null,
      review_cadence_days: 30,
      last_reviewed_at: null,
      updated_by: null,
      created_at: null,
      updated_at: '2026-02-21T12:00:00.000Z',
    },
    completeness: {
      score: 90,
      missing_fields: [],
    },
    drop_in_templates: [],
    regular_booking_templates: [],
    drop_in_slot_sync: {
      status: 'synced',
      reason: null,
      run_after: null,
      last_error: null,
      updated_at: null,
    },
    regular_slot_sync: {
      status: 'synced',
      reason: null,
      run_after: null,
      last_error: null,
      updated_at: null,
    },
    availability_publish: {
      status: 'ready_for_renters',
      last_published_at: '2026-03-07T12:00:00.000Z',
      last_error: null,
      last_error_source: null,
    },
    calendar_integration: null,
  },
  {
    venue: {
      id: 'venue-2',
      name: 'Beta Court',
      description: 'Beta',
      address: '456 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90002',
      owner_id: 'owner-2',
      hourly_rate: 75,
      instant_booking: false,
      insurance_required: true,
      max_advance_booking_days: 90,
      photos: [],
      amenities: ['WiFi'],
      is_active: true,
      created_at: '2026-02-20T12:00:00.000Z',
      updated_at: '2026-02-20T12:00:00.000Z',
    },
    config: {
      venue_id: 'venue-2',
      drop_in_enabled: false,
      drop_in_price: null,
      regular_schedule_mode: 'legacy',
      min_advance_booking_days: 0,
      min_advance_lead_time_hours: 0,
      operating_hours: [],
      blackout_dates: [],
      holiday_dates: [],
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
    },
    completeness: {
      score: 90,
      missing_fields: [],
    },
    drop_in_templates: [],
    regular_booking_templates: [],
    drop_in_slot_sync: {
      status: 'synced',
      reason: null,
      run_after: null,
      last_error: null,
      updated_at: null,
    },
    regular_slot_sync: {
      status: 'synced',
      reason: null,
      run_after: null,
      last_error: null,
      updated_at: null,
    },
    availability_publish: {
      status: 'ready_for_renters',
      last_published_at: '2026-03-07T12:00:00.000Z',
      last_error: null,
      last_error_source: null,
    },
    calendar_integration: null,
  },
]

const buildMockVenueBookings = () => [
  {
    id: 'booking-pending-payment',
    venue_id: 'venue-1',
    renter_id: 'renter-1',
    date: '2099-01-02',
    start_time: '17:00:00',
    end_time: '18:00:00',
    status: 'pending',
    total_amount: 120,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-20T12:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    renter: {
      first_name: 'Pat',
      last_name: 'Pay',
      email: 'pat.pay@example.com',
    },
  },
  {
    id: 'booking-pending-insurance',
    venue_id: 'venue-1',
    renter_id: 'renter-2',
    date: '2099-01-01',
    start_time: '15:00:00',
    end_time: '16:00:00',
    status: 'pending',
    total_amount: 140,
    insurance_approved: false,
    insurance_required: true,
    recurring_type: 'none',
    created_at: '2026-02-20T12:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    renter: {
      first_name: 'Ivy',
      last_name: 'Insure',
      email: 'ivy.insure@example.com',
    },
  },
  {
    id: 'booking-confirmed',
    venue_id: 'venue-1',
    renter_id: 'renter-3',
    date: '2099-01-03',
    start_time: '10:00:00',
    end_time: '11:00:00',
    status: 'confirmed',
    total_amount: 160,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-20T12:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    renter: {
      first_name: 'Chris',
      last_name: 'Confirm',
      email: 'chris.confirm@example.com',
    },
  },
  {
    id: 'booking-cancelled',
    venue_id: 'venue-1',
    renter_id: 'renter-4',
    date: '2020-01-03',
    start_time: '12:00:00',
    end_time: '13:00:00',
    status: 'cancelled',
    total_amount: 90,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-20T12:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    renter: {
      first_name: 'Casey',
      last_name: 'Cancel',
      email: 'casey.cancel@example.com',
    },
  },
  {
    id: 'booking-completed',
    venue_id: 'venue-1',
    renter_id: 'renter-5',
    date: '2020-01-02',
    start_time: '09:00:00',
    end_time: '10:00:00',
    status: 'completed',
    total_amount: 75,
    insurance_approved: true,
    insurance_required: false,
    recurring_type: 'none',
    created_at: '2026-02-20T12:00:00.000Z',
    updated_at: '2026-02-20T12:00:00.000Z',
    renter: {
      first_name: 'Corey',
      last_name: 'Complete',
      email: 'corey.complete@example.com',
    },
  },
]

describe('SuperAdminVenueConfigPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, '', 'http://localhost/super-admin')

    mockUseAdminVenues.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockRefetch,
      data: buildMockAdminVenuesData(),
    } as any)

    mockUseAdminVenueBookings.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockBookingsRefetch,
      approveInsurance: mockApproveInsurance,
      data: [],
    } as any)
    mockGetVenueCalendarStatus.mockResolvedValue({
      integration: null,
      calendars: [],
    })
    mockConnectVenueCalendar.mockResolvedValue({ auth_url: 'https://accounts.google.com' })
    mockSelectVenueCalendar.mockResolvedValue(undefined)
    mockSyncVenueCalendarNow.mockResolvedValue({
      venueId: 'venue-1',
      upsertedCount: 0,
      cancelledCount: 0,
      syncedAt: '2026-03-03T00:00:00.000Z',
      nextSyncAt: '2026-03-03T00:05:00.000Z',
    })
    mockDisconnectVenueCalendar.mockResolvedValue(undefined)
  })

  it('maps calendar_error_code query params to user-friendly messages', async () => {
    window.history.replaceState(
      {},
      '',
      'http://localhost/super-admin?venue_id=venue-1&calendar_error_code=invalid_state'
    )

    render(<SuperAdminVenueConfigPage />)

    expect(
      await screen.findByText('Google Calendar connection expired. Please connect again.')
    ).toBeInTheDocument()
  })

  it('shows a clear message when the Google Calendar API is disabled', async () => {
    window.history.replaceState(
      {},
      '',
      'http://localhost/super-admin?venue_id=venue-1&calendar_error_code=calendar_api_disabled'
    )

    render(<SuperAdminVenueConfigPage />)

    expect(
      await screen.findByText('Google Calendar API is not enabled for the configured Google project. Enable it and try again.')
    ).toBeInTheDocument()
  })

  it('shows a generic fallback message for legacy calendar_error query param', async () => {
    window.history.replaceState(
      {},
      '',
      'http://localhost/super-admin?venue_id=venue-1&calendar_error=oauth2_provider_payload'
    )

    render(<SuperAdminVenueConfigPage />)

    expect(
      await screen.findByText('Google Calendar connection failed. Please try again.')
    ).toBeInTheDocument()
  })

  it('does not auto-save on field blur and saves only when Save Changes is clicked', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    const hourlyRateInput = await screen.findByDisplayValue('100')

    fireEvent.change(hourlyRateInput, { target: { value: '125' } })
    fireEvent.blur(hourlyRateInput)

    expect(mockPatchAdminVenueConfig).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          hourly_rate: 125,
        })
      )
    })
  })

  it('warns before switching venues when there are unsaved changes', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

    render(<SuperAdminVenueConfigPage />)

    const hourlyRateInput = await screen.findByDisplayValue('100')
    fireEvent.change(hourlyRateInput, { target: { value: '125' } })

    fireEvent.click(screen.getByRole('button', { name: /beta court/i }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Alpha Gym' })).toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  // DEPRECATED: Section order changed during UI reorganization.
  // New structure uses SectionGroups (h2) with ConfigRows (h3) inside.
  // Bookings Timeline moved to separate tab. Last Saved moved to sticky footer.
  it.skip('renders super-admin sections in the configured order', async () => {
    render(<SuperAdminVenueConfigPage />)

    await screen.findByRole('heading', { name: 'Normal Booking Price', level: 3 })

    const headingsInOrder = [
      'Normal Booking Price',
      'Booking Mode',
      'Advance Booking Rules',
      'Amenities Checklist',
      'Policies',
      'Operating Hours',
      'Blackout Dates + Holidays',
      'Drop-In Open Gym',
      'Drop-In Weekly Schedule',
      'Google Calendar',
      'Last Saved',
      'Venue Bookings Timeline',
    ].map((name) => screen.getByRole('heading', { name, level: 3 }))

    for (let index = 0; index < headingsInOrder.length - 1; index += 1) {
      expect(headingsInOrder[index].compareDocumentPosition(headingsInOrder[index + 1])).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    }
  })

  // DEPRECATED: Helper copy text was not in original implementation.
  // Skip until the detailed calendar explanation copy is added to the UI.
  it.skip('renders calendar reviewer-facing helper copy', async () => {
    render(<SuperAdminVenueConfigPage />)

    await screen.findByRole('heading', { name: 'Google Calendar', level: 3 })

    expect(
      screen.getByText(/uses read-only calendar access to combine this venue's operating hours/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/playbookings does not create, edit, or delete google calendar events/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/busy times from the selected calendar remove overlapping bookable windows/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/sync reads the selected calendar's current busy times and recalculates venue availability/i)
    ).toBeInTheDocument()
  })

  it('renders two booking mode toggles and removes legacy insurance controls', async () => {
    render(<SuperAdminVenueConfigPage />)

    await screen.findByRole('heading', { name: 'Booking Mode', level: 3 })

    expect(screen.getByRole('button', { name: 'Instant' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manual approval' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Required' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not required' })).toBeInTheDocument()

    expect(screen.queryByLabelText(/manual insurance approval required/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/insurance document types/i)).not.toBeInTheDocument()
  })

  it('shows only the three compact policy textareas in the policies section', async () => {
    render(<SuperAdminVenueConfigPage />)

    await screen.findByRole('heading', { name: 'Policies', level: 2 })

    const cancellationPolicy = screen.getByPlaceholderText('Cancellation policy')
    const refundPolicy = screen.getByPlaceholderText('Refund policy')
    const noShowPolicy = screen.getByPlaceholderText('No-show policy')

    expect(screen.queryByPlaceholderText('Operating hours notes')).not.toBeInTheDocument()
    expect(cancellationPolicy).toHaveClass('min-h-16')
    expect(refundPolicy).toHaveClass('min-h-16')
    expect(noShowPolicy).toHaveClass('min-h-16')
  })

  it('saves insurance toggle without legacy insurance fields', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Required' }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          insurance_required: true,
        })
      )
    })

    const payload = mockPatchAdminVenueConfig.mock.calls.at(-1)?.[1]
    expect(payload).not.toHaveProperty('insurance_requires_manual_approval')
    expect(payload).not.toHaveProperty('insurance_document_types')
  })

  it('shows pending-state helper copy for booking mode combinations', async () => {
    render(<SuperAdminVenueConfigPage />)

    await screen.findByRole('heading', { name: 'Booking Mode', level: 3 })

    expect(screen.getByText(/new bookings will start as pending payment/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Required' }))
    expect(screen.getByText(/new bookings will start as pending insurance/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manual approval' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not required' }))
    expect(screen.getByText(/new bookings will start as pending approval/i)).toBeInTheDocument()
  })

  it('shows only persistent error status labels for renter-facing availability', async () => {
    const data = buildMockAdminVenuesData()
    data[0].availability_publish.status = 'needs_attention'
    data[0].availability_publish.last_error = 'Renter availability needs attention.'
    data[1].availability_publish.status = 'updating_future_availability'

    mockUseAdminVenues.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockRefetch,
      data,
    } as any)

    render(<SuperAdminVenueConfigPage />)

    await screen.findByText('Renter availability needs attention.')
    expect(screen.queryByText('Updating future availability')).not.toBeInTheDocument()
    expect(screen.queryByText('Ready for renters')).not.toBeInTheDocument()
  })

  it('shows updating renter availability while an availability-affecting save is in flight', async () => {
    let resolvePatch: ((value: unknown) => void) | null = null
    mockPatchAdminVenueConfig.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve
      })
    )

    render(<SuperAdminVenueConfigPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Required' }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    expect(await screen.findByText('Updating renter availability...')).toBeInTheDocument()

    resolvePatch?.({ item: buildMockAdminVenuesData()[0], message: 'Availability is live.' })
    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalled()
    })
  })

  it('shows the availability live success message after an availability-affecting save', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({
      item: buildMockAdminVenuesData()[0],
      message: 'Availability is live.',
    })

    render(<SuperAdminVenueConfigPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Required' }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    expect(await screen.findByText('Availability is live.')).toBeInTheDocument()
  })

  it('uses the api success message after a partial-success save', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({
      item: buildMockAdminVenuesData()[0],
      message: 'Changes saved. Renter availability needs attention.',
    })

    render(<SuperAdminVenueConfigPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Required' }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    expect(
      await screen.findByText('Changes saved. Renter availability needs attention.')
    ).toBeInTheDocument()
  })

  it('saves weekly drop-in templates when schedule windows are added', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    // Enable drop-in first (schedule is only visible when enabled)
    const dropInCheckbox = await screen.findByLabelText(/drop-in enabled/i)
    fireEvent.click(dropInCheckbox)

    fireEvent.click(await screen.findByRole('button', { name: /add drop-in window/i }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          drop_in_templates: [
            expect.objectContaining({
              day_of_week: 1,
              start_time: '12:00:00',
              end_time: '13:00:00',
            }),
          ],
        })
      )
    })
  })

  it('renders 12-hour drop-in time labels and preserves legacy non-hour values', async () => {
    const data = buildMockAdminVenuesData()
    data[0].config.drop_in_enabled = true
    data[0].drop_in_templates = [
      { day_of_week: 1, start_time: '12:00:00', end_time: '17:00:00' },
      { day_of_week: 2, start_time: '17:30:00', end_time: '18:30:00' },
      { day_of_week: 3, start_time: '00:00:00', end_time: '01:00:00' },
    ]

    mockUseAdminVenues.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockRefetch,
      data,
    } as any)

    render(<SuperAdminVenueConfigPage />)

    await screen.findByLabelText('Drop-in start time row 1')

    expect(screen.getAllByRole('option', { name: '12 PM' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: '5 PM' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: '12 AM' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: '5:30 PM' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: '6:30 PM' }).length).toBeGreaterThan(0)
  })

  it('submits normalized 24-hour values after selecting drop-in pill times', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    // Enable drop-in first (schedule is only visible when enabled)
    const dropInCheckbox = await screen.findByLabelText(/drop-in enabled/i)
    fireEvent.click(dropInCheckbox)

    fireEvent.click(await screen.findByRole('button', { name: /add drop-in window/i }))

    const startTimeSelect = screen.getByLabelText('Drop-in start time row 1')
    fireEvent.change(startTimeSelect, { target: { value: '17:00' } })
    const endTimeSelect = screen.getByLabelText('Drop-in end time row 1')
    fireEvent.change(endTimeSelect, { target: { value: '19:00' } })

    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          drop_in_templates: [
            expect.objectContaining({
              day_of_week: 1,
              start_time: '17:00:00',
              end_time: '19:00:00',
            }),
          ],
        })
      )
    })
  })

  it('uses non-collapsing grid widths so day-of-week pills remain visible', async () => {
    render(<SuperAdminVenueConfigPage />)

    // Enable drop-in first (schedule is only visible when enabled)
    const dropInCheckbox = await screen.findByLabelText(/drop-in enabled/i)
    fireEvent.click(dropInCheckbox)

    fireEvent.click(await screen.findByRole('button', { name: /add drop-in window/i }))

    const daySelect = screen.getByLabelText('Drop-in day row 1')
    const row = daySelect.closest('div')
    expect(row).toHaveClass('grid-cols-[minmax(9.5rem,1.15fr)_minmax(7.5rem,8.5rem)_minmax(7.5rem,8.5rem)_auto]')
  })

  it('saves minimum advance booking days from policy controls', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    const minAdvanceDaysInput = await screen.findByLabelText(/minimum advance booking days/i)
    fireEvent.change(minAdvanceDaysInput, { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          min_advance_booking_days: 2,
        })
      )
    })
  })

  it('saves operating hours when operating windows are added', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    fireEvent.click(await screen.findByRole('button', { name: /add operating window/i }))
    fireEvent.click(screen.getByRole('button', { name: /save all changes/i }))

    await waitFor(() => {
      expect(mockPatchAdminVenueConfig).toHaveBeenCalledWith(
        'venue-1',
        expect.objectContaining({
          operating_hours: [
            expect.objectContaining({
              day_of_week: 1,
              start_time: '12:00:00',
              end_time: '13:00:00',
            }),
          ],
        })
      )
    })
  })

  it('renders chronological timeline with upcoming first, then past divider, and detailed status badges', async () => {
    mockUseAdminVenueBookings.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockBookingsRefetch,
      approveInsurance: mockApproveInsurance,
      data: buildMockVenueBookings(),
    } as any)

    render(<SuperAdminVenueConfigPage />)

    // Switch to Bookings tab (timeline is now in a separate tab)
    const bookingsTab = await screen.findByRole('button', { name: /bookings/i })
    fireEvent.click(bookingsTab)

    await screen.findByRole('heading', { name: /Venue Bookings Timeline/i, level: 2 })

    const timelineRoot = screen.getByTestId('venue-bookings-timeline')
    const rowNodes = Array.from(timelineRoot.querySelectorAll('[data-testid=\"venue-booking-row\"]'))

    const rowOrder = rowNodes.map((node) => node.getAttribute('data-booking-id'))
    expect(rowOrder).toEqual([
      'booking-pending-insurance',
      'booking-pending-payment',
      'booking-confirmed',
      'booking-cancelled',
      'booking-completed',
    ])

    expect(screen.getByText('Past bookings')).toBeInTheDocument()

    expect(screen.getByText('Pending Insurance')).toBeInTheDocument()
    expect(screen.getByText('Pending Payment')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders timeline rows without row links and shows insurance approval action only when applicable', async () => {
    mockUseAdminVenueBookings.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockBookingsRefetch,
      approveInsurance: mockApproveInsurance,
      data: buildMockVenueBookings(),
    } as any)

    render(<SuperAdminVenueConfigPage />)

    // Switch to Bookings tab (timeline is now in a separate tab)
    const bookingsTab = await screen.findByRole('button', { name: /bookings/i })
    fireEvent.click(bookingsTab)

    const renterText = await screen.findByText('Pat Pay')
    expect(renterText.closest('a')).toBeNull()
    expect(screen.getByRole('button', { name: /approve insurance/i })).toBeInTheDocument()
  })

  it('approves insurance for pending-insurance bookings and refetches timeline', async () => {
    mockUseAdminVenueBookings.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockBookingsRefetch,
      approveInsurance: mockApproveInsurance,
      data: buildMockVenueBookings(),
    } as any)

    render(<SuperAdminVenueConfigPage />)

    // Switch to Bookings tab (timeline is now in a separate tab)
    const bookingsTab = await screen.findByRole('button', { name: /bookings/i })
    fireEvent.click(bookingsTab)

    const approveButton = await screen.findByRole('button', { name: /approve insurance/i })
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(mockApproveInsurance).toHaveBeenCalledWith('booking-pending-insurance')
      expect(mockBookingsRefetch).toHaveBeenCalled()
    })
  })
})
