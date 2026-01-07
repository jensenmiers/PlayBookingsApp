'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
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

          // Check if this is a host sign-up
          const intent = searchParams.get('intent')
          const isHostSignup = intent === 'host'

          // Check if user profile already exists
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, is_venue_owner')
            .eq('id', user.id)
            .single()

          // If user exists and this is a host sign-up, check if they need to upgrade
          if (existingUser && !fetchError) {
            if (isHostSignup && !existingUser.is_venue_owner) {
              // Existing renter trying to become a host - redirect to upgrade page
              router.push('/auth/upgrade-to-host')
              return
            }
            // If already a venue owner, proceed normally
            // If not a host sign-up, proceed normally
          }

          // User doesn't exist or we need to update them
          const fullName = user.user_metadata?.full_name || ''
          const [firstName, ...lastNameParts] = fullName.split(' ')

          const { error: profileError } = await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email,
                first_name: firstName || null,
                last_name: lastNameParts.join(' ') || null,
                is_renter: true,
                is_venue_owner: existingUser?.is_venue_owner ?? isHostSignup,
                is_admin: false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )

          if (profileError) {
            console.error('Error creating/updating user profile:', profileError)
            // Still proceed even if profile creation fails
          }

          setStatus('success')
          
          // Get returnTo param and validate it (only allow relative paths starting with /)
          // Hosts should go to dashboard, renters to venues
          const returnTo = searchParams.get('returnTo')
          const finalIsHost = existingUser?.is_venue_owner ?? isHostSignup
          let redirectPath = finalIsHost ? '/dashboard' : '/venues' // Default destination
          
          if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
            // Valid relative path - use it
            redirectPath = returnTo
          }
          
          // Redirect after a brief success message
          setTimeout(() => {
            router.push(redirectPath)
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
  }, [supabase, router, searchParams])

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
          <h2 className="text-xl font-semibold text-primary-800">Welcome to Play Bookings!</h2>
          <p className="text-primary-600">
            {searchParams.get('intent') === 'host' 
              ? 'Setting up your host account...' 
              : 'Let\'s find you a venue to book...'}
          </p>
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

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50/80 to-secondary-50">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-secondary-600 border-t-transparent" />
        <h2 className="text-xl font-semibold text-primary-800">Loading...</h2>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
