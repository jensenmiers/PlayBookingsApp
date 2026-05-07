import {
  clearAuthResumeState,
  consumeAuthResumeStateForReturnTo,
  peekAuthResumeStateForReturnTo,
  persistAuthResumeState,
} from '@/lib/auth/authResume'

describe('authResume helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('persists and consumes create-booking-form state once', () => {
    persistAuthResumeState({
      returnTo: '/search?date=2026-03-16#calendar',
      resumeState: {
        type: 'create-booking-form',
        venueId: 'venue-1',
        date: '2026-03-20',
        startTime: '18:00:00',
        endTime: '20:00:00',
        recurringType: 'none',
        notes: 'Bring pinnies',
      },
    })

    expect(peekAuthResumeStateForReturnTo('/search?date=2026-03-16#calendar')).toEqual({
      type: 'create-booking-form',
      venueId: 'venue-1',
      date: '2026-03-20',
      startTime: '18:00:00',
      endTime: '20:00:00',
      recurringType: 'none',
      notes: 'Bring pinnies',
    })

    expect(consumeAuthResumeStateForReturnTo('/search?date=2026-03-16#calendar')).toEqual({
      type: 'create-booking-form',
      venueId: 'venue-1',
      date: '2026-03-20',
      startTime: '18:00:00',
      endTime: '20:00:00',
      recurringType: 'none',
      notes: 'Bring pinnies',
    })
    expect(peekAuthResumeStateForReturnTo('/search?date=2026-03-16#calendar')).toBeNull()
  })

  it('persists and consumes slot-booking state once', () => {
    persistAuthResumeState({
      returnTo: '/venue/memorial-park',
      resumeState: {
        type: 'slot-booking',
        venueId: 'venue-1',
        date: '2026-03-20',
        startTime: '18:00:00',
        endTime: '19:00:00',
        slotActionType: 'request_private',
        slotInstanceId: 'slot-1',
        slotModalContent: null,
      },
    })

    expect(consumeAuthResumeStateForReturnTo('/venue/memorial-park')).toEqual({
      type: 'slot-booking',
      venueId: 'venue-1',
      date: '2026-03-20',
      startTime: '18:00:00',
      endTime: '19:00:00',
      slotActionType: 'request_private',
      slotInstanceId: 'slot-1',
      slotModalContent: null,
    })
    expect(consumeAuthResumeStateForReturnTo('/venue/memorial-park')).toBeNull()
  })

  it('persists and consumes request-to-book state once', () => {
    persistAuthResumeState({
      returnTo: '/venue/first-presbyterian-church-of-hollywood',
      resumeState: {
        type: 'request-to-book',
        venueId: 'venue-1',
        date: '2026-03-20',
        startTime: '18:00',
        durationHours: 2,
        notes: 'Youth basketball practice',
      },
    })

    expect(consumeAuthResumeStateForReturnTo('/venue/first-presbyterian-church-of-hollywood')).toEqual({
      type: 'request-to-book',
      venueId: 'venue-1',
      date: '2026-03-20',
      startTime: '18:00',
      durationHours: 2,
      notes: 'Youth basketball practice',
    })
    expect(consumeAuthResumeStateForReturnTo('/venue/first-presbyterian-church-of-hollywood')).toBeNull()
  })

  it('clears state when current returnTo does not match', () => {
    persistAuthResumeState({
      returnTo: '/search',
      resumeState: {
        type: 'create-booking-form',
        venueId: 'venue-1',
        date: '2026-03-20',
        startTime: '18:00:00',
        endTime: '20:00:00',
        recurringType: 'none',
        notes: '',
      },
    })

    expect(peekAuthResumeStateForReturnTo('/venues')).toBeNull()
    expect(peekAuthResumeStateForReturnTo('/search')).toBeNull()
  })

  it('clears invalid payloads silently', () => {
    window.sessionStorage.setItem('play-bookings-auth-resume', '{"bad":true}')

    expect(peekAuthResumeStateForReturnTo('/search')).toBeNull()
    expect(window.sessionStorage.getItem('play-bookings-auth-resume')).toBeNull()
  })

  it('supports explicit cleanup', () => {
    persistAuthResumeState({
      returnTo: '/search',
      resumeState: {
        type: 'create-booking-form',
        venueId: 'venue-1',
        date: '2026-03-20',
        startTime: '18:00:00',
        endTime: '20:00:00',
        recurringType: 'none',
        notes: '',
      },
    })

    clearAuthResumeState()

    expect(peekAuthResumeStateForReturnTo('/search')).toBeNull()
  })
})
