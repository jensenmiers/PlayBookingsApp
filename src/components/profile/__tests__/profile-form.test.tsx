import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileForm } from '../profile-form'

const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockFrom = jest.fn()
const mockRefresh = jest.fn()
const mockToast = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table)
      return { update: mockUpdate }
    },
  }),
}))

jest.mock('@/components/ui/use-toast', () => ({
  toast: (args: unknown) => mockToast(args),
}))

const renderForm = () =>
  render(
    <ProfileForm
      userId="user-1"
      email="player@example.com"
      initialValues={{ first_name: 'Jordan', last_name: 'Lee', phone: '' }}
    />
  )

describe('ProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  it('shows the current profile values', () => {
    renderForm()

    expect(screen.getByLabelText(/email/i)).toHaveValue('player@example.com')
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jordan')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Lee')
  })

  it('saves edits to the signed-in user row and shows success feedback', async () => {
    renderForm()

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: ' Jordy ' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '(555) 123-4567' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    })

    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith({
      first_name: 'Jordy',
      last_name: 'Lee',
      phone: '(555) 123-4567',
      updated_at: expect.any(String),
    })
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('rejects an invalid phone number without saving', () => {
    renderForm()

    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '12ab' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('shows error feedback when the update fails', async () => {
    mockEq.mockResolvedValue({ error: { message: 'permission denied' } })
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', description: 'permission denied' })
      )
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
