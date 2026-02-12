'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { createClient } from '@/lib/supabase/client'

export function AuthModal() {
  const { isOpen, intent, returnTo, contextMessage, closeAuthModal } = useAuthModal()
  const [loading, setLoading] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [popupWindow, setPopupWindow] = useState<Window | null>(null)


  const buildAuthUrl = useCallback(() => {
    const callbackParams = new URLSearchParams()
    callbackParams.set('popup', 'true')
    
    if (returnTo) {
      callbackParams.set('returnTo', returnTo)
    }
    if (intent === 'host') {
      callbackParams.set('intent', 'host')
    }
    
    return `${window.location.origin}/auth/callback?${callbackParams.toString()}`
  }, [returnTo, intent])

  // Monitor popup window - when it closes, check if auth succeeded.
  useEffect(() => {
    if (!popupWindow) return

    const checkPopupClosed = setInterval(async () => {
      if (popupWindow.closed) {
        clearInterval(checkPopupClosed)
        setPopupWindow(null)

        // Give a moment for BroadcastChannel/postMessage to arrive
        await new Promise(r => setTimeout(r, 500))

        // Check if session was established (same-origin popup success)
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()

        if (data?.session) {
          // Session found - trigger onAuthStateChange
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
        }

        setLoading(false)
      }
    }, 500)

    return () => clearInterval(checkPopupClosed)
  }, [popupWindow])

  // Listen for auth completion from popup via BroadcastChannel + postMessage fallback
  useEffect(() => {
    const refreshSession = async () => {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()

      if (sessionData?.session) {
        // Explicitly set the session to trigger onAuthStateChange in useCurrentUser
        await supabase.auth.setSession({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
        })
      }

      setLoading(false)
    }

    // Primary: BroadcastChannel (works when window.opener is severed by COOP)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('play-bookings-auth')
      channel.onmessage = async (event) => {
        if (event.data?.type === 'AUTH_COMPLETE') {
          refreshSession()
        } else if (event.data?.type === 'AUTH_CODE_TO_EXCHANGE' && event.data?.code) {
          // Popup lacked code_verifier; main window has it. Exchange here.
          const supabase = createClient()
          const { error } = await supabase.auth.exchangeCodeForSession(event.data.code)
          if (!error) {
            refreshSession()
          } else {
            console.error('Fallback code exchange failed:', error)
          }
          setLoading(false)
        }
      }
    } catch {
      // BroadcastChannel not supported
    }

    // Fallback: postMessage (works when window.opener is preserved)
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'AUTH_CODE' || !event.data?.code) return

      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(event.data.code)
      if (error) {
        console.error('Code exchange failed:', error)
      }
      setLoading(false)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      channel?.close()
    }
  }, [])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setPopupBlocked(false)
      setPopupWindow(null)
    }
  }, [isOpen])

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      setPopupBlocked(false)

      const supabase = createClient()
      const callbackUrl = buildAuthUrl()

      // Calculate popup position (centered)
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true, // Prevent automatic redirect, we'll handle it
        },
      })

      if (error) {
        console.error('Error getting OAuth URL:', error)
        setLoading(false)
        return
      }

      if (!data.url) {
        console.error('No OAuth URL returned')
        setLoading(false)
        return
      }

      // Open popup window
      const popup = window.open(
        data.url,
        'PlayBookingsAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked
        setPopupBlocked(true)
        setLoading(false)
        return
      }

      setPopupWindow(popup)
      popup.focus()

    } catch (error) {
      console.error('Error during authentication:', error)
      setLoading(false)
    }
  }

  const handleFallbackRedirect = async () => {
    setLoading(true)
    
    const supabase = createClient()
    const callbackUrl = buildAuthUrl().replace('popup=true', 'popup=false')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (error) {
      console.error('Error during redirect authentication:', error)
      setLoading(false)
    }
  }

  // Dynamic content based on intent
  const title = contextMessage 
    ? 'Sign In Required'
    : intent === 'host' 
      ? 'Become a Host' 
      : 'Welcome to Play Bookings!'

  const description = contextMessage 
    ?? (intent === 'host'
      ? 'Create your host account to list your courts and start earning revenue'
      : 'Sign in to book courts and manage your reservations')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3 text-center">
          {intent === 'host' && !contextMessage && (
            <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-primary-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Host Registration
            </div>
          )}
          <DialogTitle className="text-2xl font-bold text-secondary-800">
            {title}
          </DialogTitle>
          <DialogDescription className="text-secondary-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Popup blocked error */}
          {popupBlocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Popup was blocked.</span>{' '}
                Please allow popups for this site, or click below to continue in this window.
              </p>
            </div>
          )}

          {/* Main auth button */}
          {!popupBlocked && (
            <Button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 py-3 text-base text-white hover:bg-primary-700"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Waiting for authentication...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </div>
              )}
            </Button>
          )}

          {/* Fallback button when popup is blocked */}
          {popupBlocked && (
            <Button
              onClick={handleFallbackRedirect}
              disabled={loading}
              className="w-full rounded-xl bg-primary-600 py-3 text-base text-white hover:bg-primary-700"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Redirecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue in this window</span>
                </div>
              )}
            </Button>
          )}

          {/* Loading indicator when popup is open */}
          {loading && !popupBlocked && (
            <p className="text-center text-sm text-secondary-500">
              Complete the sign-in in the popup window. This dialog will close automatically.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
