import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SuperAdminVenueConfigPage } from '../super-admin-venue-config-page'
import { patchAdminVenueConfig, useAdminVenues } from '@/hooks/useAdminVenues'

jest.mock('@/hooks/useAdminVenues', () => ({
  useAdminVenues: jest.fn(),
  patchAdminVenueConfig: jest.fn(),
}))

const mockUseAdminVenues = useAdminVenues as jest.Mock
const mockPatchAdminVenueConfig = patchAdminVenueConfig as jest.Mock

const mockRefetch = jest.fn().mockResolvedValue(undefined)

describe('SuperAdminVenueConfigPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAdminVenues.mockReturnValue({
      loading: false,
      error: null,
      refetch: mockRefetch,
      data: [
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
            min_advance_lead_time_hours: 0,
            same_day_cutoff_time: null,
            operating_hours: [],
            blackout_dates: [],
            holiday_dates: [],
            insurance_requires_manual_approval: true,
            insurance_document_types: [],
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
            min_advance_lead_time_hours: 0,
            same_day_cutoff_time: null,
            operating_hours: [],
            blackout_dates: [],
            holiday_dates: [],
            insurance_requires_manual_approval: true,
            insurance_document_types: [],
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
        },
      ],
    } as any)
  })

  it('does not auto-save on field blur and saves only when Save Changes is clicked', async () => {
    mockPatchAdminVenueConfig.mockResolvedValue({})

    render(<SuperAdminVenueConfigPage />)

    const hourlyRateInput = await screen.findByDisplayValue('100')

    fireEvent.change(hourlyRateInput, { target: { value: '125' } })
    fireEvent.blur(hourlyRateInput)

    expect(mockPatchAdminVenueConfig).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

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
})
