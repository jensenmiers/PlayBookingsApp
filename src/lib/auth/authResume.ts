import type { RecurringType, SlotActionType, SlotModalContent } from '@/types'

const AUTH_RESUME_STORAGE_KEY = 'play-bookings-auth-resume'

export interface CreateBookingFormResumeState {
  type: 'create-booking-form'
  venueId: string
  date: string
  startTime: string
  endTime: string
  recurringType: RecurringType
  notes: string
}

export interface SlotBookingResumeState {
  type: 'slot-booking'
  venueId: string
  date: string
  startTime: string
  endTime: string
  slotActionType: SlotActionType
  slotInstanceId: string | null
  slotModalContent: SlotModalContent | null
}

export interface RequestToBookResumeState {
  type: 'request-to-book'
  venueId: string
  date: string
  startTime: string
  durationHours: number
  notes: string
}

export type AuthResumeState = CreateBookingFormResumeState | SlotBookingResumeState | RequestToBookResumeState

interface StoredAuthResumeState {
  returnTo: string
  resumeState: AuthResumeState
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSlotModalContent(value: unknown): value is SlotModalContent {
  if (!isObject(value)) {
    return false
  }

  if (typeof value.title !== 'string' || typeof value.body !== 'string') {
    return false
  }

  if (
    value.bullet_points !== undefined
    && (!Array.isArray(value.bullet_points) || value.bullet_points.some((point) => typeof point !== 'string'))
  ) {
    return false
  }

  if (
    value.cta_label !== undefined
    && value.cta_label !== null
    && typeof value.cta_label !== 'string'
  ) {
    return false
  }

  return true
}

function isCreateBookingFormResumeState(value: unknown): value is CreateBookingFormResumeState {
  if (!isObject(value)) {
    return false
  }

  return value.type === 'create-booking-form'
    && typeof value.venueId === 'string'
    && typeof value.date === 'string'
    && typeof value.startTime === 'string'
    && typeof value.endTime === 'string'
    && (value.recurringType === 'none' || value.recurringType === 'weekly' || value.recurringType === 'monthly')
    && typeof value.notes === 'string'
}

function isSlotBookingResumeState(value: unknown): value is SlotBookingResumeState {
  if (!isObject(value)) {
    return false
  }

  return value.type === 'slot-booking'
    && typeof value.venueId === 'string'
    && typeof value.date === 'string'
    && typeof value.startTime === 'string'
    && typeof value.endTime === 'string'
    && (
      value.slotActionType === 'instant_book'
      || value.slotActionType === 'request_private'
      || value.slotActionType === 'info_only_open_gym'
    )
    && (value.slotInstanceId === null || typeof value.slotInstanceId === 'string')
    && (value.slotModalContent === null || isSlotModalContent(value.slotModalContent))
}

function isRequestToBookResumeState(value: unknown): value is RequestToBookResumeState {
  if (!isObject(value)) {
    return false
  }

  const durationHours = value.durationHours

  return value.type === 'request-to-book'
    && typeof value.venueId === 'string'
    && typeof value.date === 'string'
    && typeof value.startTime === 'string'
    && typeof durationHours === 'number'
    && Number.isInteger(durationHours)
    && durationHours >= 1
    && typeof value.notes === 'string'
}

function isAuthResumeState(value: unknown): value is AuthResumeState {
  return isCreateBookingFormResumeState(value)
    || isSlotBookingResumeState(value)
    || isRequestToBookResumeState(value)
}

function parseStoredAuthResumeState(rawValue: string | null): StoredAuthResumeState | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!isObject(parsed) || typeof parsed.returnTo !== 'string' || !isAuthResumeState(parsed.resumeState)) {
      return null
    }

    return {
      returnTo: parsed.returnTo,
      resumeState: parsed.resumeState,
    }
  } catch {
    return null
  }
}

function getStoredAuthResumeState(): StoredAuthResumeState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const parsed = parseStoredAuthResumeState(window.sessionStorage.getItem(AUTH_RESUME_STORAGE_KEY))
  if (!parsed) {
    window.sessionStorage.removeItem(AUTH_RESUME_STORAGE_KEY)
    return null
  }

  return parsed
}

export function getCurrentRelativeUrl(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  const { pathname, search, hash } = window.location
  return `${pathname}${search}${hash}` || '/'
}

export function persistAuthResumeState(payload: StoredAuthResumeState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(AUTH_RESUME_STORAGE_KEY, JSON.stringify(payload))
}

export function clearAuthResumeState(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(AUTH_RESUME_STORAGE_KEY)
}

export function peekAuthResumeStateForReturnTo(returnTo: string): AuthResumeState | null {
  const storedState = getStoredAuthResumeState()
  if (!storedState) {
    return null
  }

  if (storedState.returnTo !== returnTo) {
    clearAuthResumeState()
    return null
  }

  return storedState.resumeState
}

export function consumeAuthResumeStateForReturnTo(returnTo: string): AuthResumeState | null {
  const resumeState = peekAuthResumeStateForReturnTo(returnTo)
  if (!resumeState) {
    return null
  }

  clearAuthResumeState()
  return resumeState
}
