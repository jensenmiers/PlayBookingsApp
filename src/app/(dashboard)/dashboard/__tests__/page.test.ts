const mockRedirect = jest.fn()

jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

import DashboardPage from '../page'

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    })
  })

  it('redirects to /my-bookings because dashboard surface is disabled', () => {
    expect(() => DashboardPage()).toThrow('NEXT_REDIRECT:/my-bookings')
    expect(mockRedirect).toHaveBeenCalledWith('/my-bookings')
  })
})
