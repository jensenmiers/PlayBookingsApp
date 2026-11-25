const mockCapture = jest.fn()
const mockFlush = jest.fn()

jest.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: mockCapture,
    flush: mockFlush,
  }),
}))

import { captureRecentGoogleSignup } from '../authSignupEvents'

describe('captureRecentGoogleSignup', () => {
  const now = new Date('2026-08-05T12:00:00.000Z')

  beforeEach(() => {
    jest.clearAllMocks()
    mockFlush.mockResolvedValue(undefined)
  })

  it('captures a recently created Google account with a deterministic event UUID', async () => {
    await captureRecentGoogleSignup({
      user: {
        id: '01971f7b-4541-7000-880f-095ed91155c5',
        created_at: '2026-08-05T11:58:00.000Z',
        app_metadata: { provider: 'google' },
      },
      isHostSignup: true,
      now,
    })

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: '01971f7b-4541-7000-880f-095ed91155c5',
      uuid: '01971f7b-4541-7000-880f-095ed91155c5',
      event: 'user_signed_up',
      timestamp: new Date('2026-08-05T11:58:00.000Z'),
      properties: {
        method: 'google',
        is_host_signup: true,
      },
    })
    expect(mockFlush).toHaveBeenCalledTimes(1)
  })

  it('does not classify an existing Google user as a new signup', async () => {
    await captureRecentGoogleSignup({
      user: {
        id: '01971f7b-4541-7000-880f-095ed91155c5',
        created_at: '2026-08-04T12:00:00.000Z',
        app_metadata: { provider: 'google' },
      },
      isHostSignup: false,
      now,
    })

    expect(mockCapture).not.toHaveBeenCalled()
    expect(mockFlush).not.toHaveBeenCalled()
  })

  it('does not duplicate the existing email signup capture', async () => {
    await captureRecentGoogleSignup({
      user: {
        id: '01971f7b-4541-7000-880f-095ed91155c5',
        created_at: '2026-08-05T11:58:00.000Z',
        app_metadata: { provider: 'email' },
      },
      isHostSignup: false,
      now,
    })

    expect(mockCapture).not.toHaveBeenCalled()
    expect(mockFlush).not.toHaveBeenCalled()
  })

  it('keeps authentication successful when analytics delivery fails', async () => {
    mockFlush.mockRejectedValueOnce(new Error('PostHog unavailable'))
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(captureRecentGoogleSignup({
      user: {
        id: '01971f7b-4541-7000-880f-095ed91155c5',
        created_at: '2026-08-05T11:58:00.000Z',
        app_metadata: { provider: 'google' },
      },
      isHostSignup: false,
      now,
    })).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith('Failed to capture Google signup analytics')
    errorSpy.mockRestore()
  })
})
