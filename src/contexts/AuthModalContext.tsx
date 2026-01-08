'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export type AuthIntent = 'renter' | 'host'

export interface OpenAuthModalOptions {
  intent?: AuthIntent
  returnTo?: string
  contextMessage?: string
}

interface AuthModalState {
  isOpen: boolean
  intent: AuthIntent
  returnTo: string | null
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
  const pathname = usePathname()
  const { user } = useCurrentUser()
  
  const [state, setState] = useState<AuthModalState>({
    isOpen: false,
    intent: 'renter',
    returnTo: null,
    contextMessage: undefined,
  })

  // Auto-close modal when user becomes authenticated
  useEffect(() => {
    if (user && state.isOpen) {
      setState(prev => ({ ...prev, isOpen: false }))
    }
  }, [user, state.isOpen])

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    setState({
      isOpen: true,
      intent: options?.intent ?? 'renter',
      returnTo: options?.returnTo ?? pathname,
      contextMessage: options?.contextMessage,
    })
  }, [pathname])

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
