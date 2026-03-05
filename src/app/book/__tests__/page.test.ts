/**
 * Route behavior test for legacy /book page.
 * The deprecated page should hard-redirect to /search.
 */

jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

import BookPage from '../page'
import { redirect } from 'next/navigation'

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('/book page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects users to /search', () => {
    expect(() => BookPage()).toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/search')
  })
})
