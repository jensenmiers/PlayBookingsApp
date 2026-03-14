import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CompleteProfilePage from '../page'

const mockGet = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockNavigateToUrl = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 'user-1', phone: null },
    loading: false,
    error: null,
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: mockUpdate,
    }),
  }),
}))

jest.mock('@/lib/auth/clientNavigation', () => ({
  navigateToUrl: (...args: unknown[]) => mockNavigateToUrl(...args),
}))

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockImplementation((key: string) => (key === 'next' ? '/search' : null))
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  it('saves the phone number and redirects to the next path', async () => {
    render(<CompleteProfilePage />)

    fireEvent.change(screen.getByLabelText(/phone number/i), {
      target: { value: '5551234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        phone: '5551234567',
        updated_at: expect.any(String),
      })
    })

    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/search')
  })

  it('lets the user skip phone capture', () => {
    render(<CompleteProfilePage />)

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))

    expect(mockNavigateToUrl).toHaveBeenCalledWith('/search')
  })
})
