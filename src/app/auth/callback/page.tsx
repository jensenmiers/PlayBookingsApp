'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setErrorMessage(error.message)
          setStatus('error')
          return
        }

        if (data.session) {
          const user = data.session.user
          console.log('User authenticated:', user.email)

          // Check if we have a pending role selection from registration
          const pendingRole = localStorage.getItem('pendingUserRole')
          
          if (pendingRole) {
            // This is a new user registration - create user profile with role
            const { error: profileError } = await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata.full_name,
                avatar_url: user.user_metadata.avatar_url,
                role: pendingRole,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            if (profileError) {
              console.error('Error creating user profile:', profileError)
              // Still proceed to dashboard even if profile creation fails
            }

            // Clear the pending role
            localStorage.removeItem('pendingUserRole')
          }

          setStatus('success')
          
          // Redirect to dashboard after a brief success message
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          setErrorMessage('No session found')
          setStatus('error')
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        setErrorMessage('An unexpected error occurred')
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [supabase, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50/80 to-secondary-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-secondary-600 border-t-transparent" />
          <h2 className="text-xl font-semibold text-primary-800">Signing you in...</h2>
          <p className="text-primary-600">Please wait while we complete your authentication.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50/80 to-secondary-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-primary-800">Welcome to PlayBookings!</h2>
          <p className="text-primary-600">Redirecting you to your dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50/80 to-secondary-50">
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border/50 bg-white/95 p-8 text-center shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-primary-800">Authentication Error</h2>
          <p className="text-primary-600">{errorMessage}</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400 focus-visible:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
