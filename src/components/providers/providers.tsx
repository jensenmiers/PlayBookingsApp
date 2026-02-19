'use client'

import { type ReactNode } from 'react'
import { AuthModalProvider } from '@/contexts/AuthModalContext'
import { AuthModal } from '@/components/auth/auth-modal'
import { Toaster } from '@/components/ui/toaster'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { PostHogUserIdentification } from '@/components/providers/posthog-user-identification'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider>
      <AuthModalProvider>
        <PostHogUserIdentification />
        {children}
        <AuthModal />
        <Toaster />
      </AuthModalProvider>
    </PostHogProvider>
  )
}
