'use client'

import { type ReactNode } from 'react'
import { AuthModalProvider } from '@/contexts/AuthModalContext'
import { AuthModal } from '@/components/auth/auth-modal'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthModalProvider>
      {children}
      <AuthModal />
    </AuthModalProvider>
  )
}
