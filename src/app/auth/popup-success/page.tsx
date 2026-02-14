'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function PopupSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'success' | 'error'>('success')
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      setStatus('error')
      return
    }

    try {
      const channel = new BroadcastChannel('play-bookings-auth')
      channel.postMessage({ type: 'AUTH_COMPLETE' })
      channel.close()
    } catch {
      // BroadcastChannel not supported
    }

    setTimeout(() => {
      try {
        window.close()
      } catch {
        const returnTo = searchParams.get('returnTo')
        let redirectPath = '/search'
        if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
          redirectPath = returnTo
        }
        router.push(redirectPath)
      }
    }, 500)
  }, [error, searchParams, router])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary-50 via-secondary-50/80 to-primary-50 p-4">
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-border/50 bg-white/95 p-8 text-center shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-secondary-800">Authentication Error</h2>
          <p className="text-secondary-600">{error}</p>
          <button
            onClick={() => window.close()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary-50 via-secondary-50/80 to-primary-50">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-secondary-800">Success!</h2>
        <p className="text-secondary-600">Closing this window...</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary-50 via-secondary-50/80 to-primary-50">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <h2 className="text-xl font-semibold text-secondary-800">Loading...</h2>
      </div>
    </div>
  )
}

export default function PopupSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PopupSuccessContent />
    </Suspense>
  )
}
