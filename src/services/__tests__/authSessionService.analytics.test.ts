const mockCaptureRecentGoogleSignup = jest.fn()

jest.mock('@/lib/analytics/authSignupEvents', () => ({
  captureRecentGoogleSignup: (...args: unknown[]) => mockCaptureRecentGoogleSignup(...args),
}))

import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { finalizeAuthenticatedUser } from '../authSessionService'

describe('finalizeAuthenticatedUser analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCaptureRecentGoogleSignup.mockResolvedValue(undefined)
  })

  it('checks for a completed Google signup after finalizing the authenticated user', async () => {
    const user = {
      id: '01971f7b-4541-7000-880f-095ed91155c5',
      email: 'new-user@example.com',
      created_at: '2026-08-05T11:58:00.000Z',
      app_metadata: { provider: 'google' },
      user_metadata: { full_name: 'New User' },
    }
    const single = jest.fn().mockResolvedValue({
      data: { id: user.id, is_venue_owner: false },
      error: null,
    })
    const eq = jest.fn(() => ({ single }))
    const select = jest.fn(() => ({ eq }))
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: jest.fn(() => ({ select, upsert })),
    } as unknown as SupabaseClient
    const session = { user } as unknown as Session

    await finalizeAuthenticatedUser({ supabase, session, intent: 'host' })

    expect(mockCaptureRecentGoogleSignup).toHaveBeenCalledWith({
      user,
      isHostSignup: true,
    })
  })
})
