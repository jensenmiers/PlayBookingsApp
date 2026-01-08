'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useRef } from 'react'

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'closing'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const hasRun = useRef(false)

  useEffect(() => {
    // Detect popup mode via window.opener (since query params are lost through OAuth)
    const isPopup = typeof window !== 'undefined' && window.opener !== null
    const urlCode = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('code') : null

    // Prevent double execution in strict mode
    if (hasRun.current) return
    hasRun.current = true

    const handleAuthCallback = async () => {
      try {
        // POPUP MODE: Exchange the code and close the popup
        // The PKCE code_verifier is in localStorage which is shared between popup and main window
        if (isPopup && urlCode) {
          // Try to exchange the code for a session
          const { data: popupExchangeData, error: popupExchangeError } = await supabase.auth.exchangeCodeForSession(urlCode)

          if (popupExchangeError) {
            // Code exchange failed - send the code to the main window as a fallback
            if (window.opener) {
              window.opener.postMessage(
                { type: 'AUTH_CODE', code: urlCode, returnTo: searchParams.get('returnTo'), intent: searchParams.get('intent') },
                window.location.origin
              )
            }
          }

          setStatus('closing')
          
          // Close the popup after a short delay to ensure exchange completes
          setTimeout(() => {
            try {
              window.close()
            } catch {
              // If window.close fails, redirect as fallback
              const returnTo = searchParams.get('returnTo')
              let redirectPath = '/search'
              if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
                redirectPath = returnTo
              }
              router.push(redirectPath)
            }
          }, 500)
          
          return
        }

        // NON-POPUP MODE: Exchange the code for a session
        // If no code in URL, try getSession first (might already have session)
        if (!urlCode) {
          const { data, error } = await supabase.auth.getSession()
          if (error || !data.session) {
            setErrorMessage('No authorization code found')
            setStatus('error')
            return
          }
        }

        // Exchange the auth code for a session (required for PKCE flow)
        let session = null
        let exchangeError = null
        
        if (urlCode) {
          const result = await supabase.auth.exchangeCodeForSession(urlCode)
          session = result.data.session
          exchangeError = result.error
        } else {
          const result = await supabase.auth.getSession()
          session = result.data.session
          exchangeError = result.error
        }

        if (exchangeError) {
          console.error('Auth code exchange error:', exchangeError)
          setErrorMessage(exchangeError.message)
          setStatus('error')
          return
        }

        if (session) {
          const user = session.user
          console.log('User authenticated:', user.email)

          // Check if this is a host sign-up (from URL params that may have been preserved)
          const intent = searchParams.get('intent')
          const isHostSignup = intent === 'host'

          // Check if user profile already exists
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, is_venue_owner')
            .eq('id', user.id)
            .single()

          // Determine if this is an existing renter trying to become a host
          const needsUpgrade = existingUser && !fetchError && isHostSignup && !existingUser.is_venue_owner

          // User doesn't exist or we need to update them
          if (!needsUpgrade) {
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
            }
          }

          // If user exists and this is a host sign-up, check if they need to upgrade
          if (needsUpgrade) {
            router.push('/auth/upgrade-to-host')
            return
          }

          setStatus('success')
          
          // Get returnTo param and validate it (only allow relative paths starting with /)
          // Hosts should go to dashboard, renters to search
          const returnTo = searchParams.get('returnTo')
          const finalIsHost = existingUser?.is_venue_owner ?? isHostSignup
          let redirectPath = finalIsHost ? '/dashboard' : '/search'
          
          if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
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

  // Popup closing state - show minimal UI
  if (status === 'closing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-primary-50/80 to-secondary-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-primary-800">Success!</h2>
          <p className="text-primary-600">Closing this window...</p>
        </div>
      </div>
    )
  }

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
