'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  clearAuthResumeState,
  getCurrentRelativeUrl,
  peekAuthResumeStateForReturnTo,
  type AuthResumeState,
} from '@/lib/auth/authResume'

export type AuthIntent = 'renter' | 'host'

export interface OpenAuthModalOptions {
  intent?: AuthIntent
  returnTo?: string
  resumeState?: AuthResumeState
  contextMessage?: string
}

interface AuthModalState {
  isOpen: boolean
  intent: AuthIntent
  returnTo: string | null
  resumeState: AuthResumeState | null
  contextMessage?: string
}

interface AuthModalContextValue extends AuthModalState {
  openAuthModal: (options?: OpenAuthModalOptions) => void
  closeAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}

interface AuthModalProviderProps {
  children: ReactNode
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const { user } = useCurrentUser()
  
  const [state, setState] = useState<AuthModalState>({
    isOpen: false,
    intent: 'renter',
    returnTo: null,
    resumeState: null,
    contextMessage: undefined,
  })

  // Auto-close modal when user becomes authenticated
  useEffect(() => {
    if (user && state.isOpen) {
      setState(prev => ({ ...prev, isOpen: false }))
    }
  }, [user, state.isOpen])

  useEffect(() => {
    const currentReturnTo = getCurrentRelativeUrl()
    const storedResumeState = peekAuthResumeStateForReturnTo(currentReturnTo)
    if (!storedResumeState && typeof window !== 'undefined' && window.sessionStorage.getItem('play-bookings-auth-resume')) {
      clearAuthResumeState()
    }
  })

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    const currentReturnTo = options?.returnTo ?? getCurrentRelativeUrl()
    setState({
      isOpen: true,
      intent: options?.intent ?? 'renter',
      returnTo: currentReturnTo,
      resumeState: options?.resumeState ?? null,
      contextMessage: options?.contextMessage,
    })
  }, [])

  const closeAuthModal = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <AuthModalContext.Provider
      value={{
        ...state,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}
