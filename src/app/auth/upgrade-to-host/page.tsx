'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function UpgradeToHostContent() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleConfirmUpgrade = async () => {
    try {
      setLoading(true)

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('Error getting user:', authError)
        alert('Error: Please sign in first')
        router.push('/auth/login')
        return
      }

      // Update user to add venue owner capability
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_venue_owner: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error upgrading to host:', updateError)
        alert('Error upgrading to host: ' + updateError.message)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/venues')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-secondary-50/10 bg-secondary-800 p-8 shadow-soft">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-400/15 text-primary-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold font-serif text-secondary-50">Add Host Capabilities?</CardTitle>
          <CardDescription className="text-secondary-50/60">
            You already have a renter account. Would you like to add hosting capabilities so you can list your courts?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-secondary-50/5 p-4 text-sm text-secondary-50/70">
            <p className="font-semibold mb-2">With hosting capabilities, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>List your courts and set availability</li>
              <li>Receive bookings and manage your calendar</li>
              <li>Track earnings and manage payouts</li>
              <li>Access the host dashboard</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleConfirmUpgrade}
              disabled={loading}
              className="w-full rounded-xl bg-primary-400 py-3 text-base text-secondary-900 hover:bg-primary-500"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Upgrading...</span>
                </div>
              ) : (
                'Yes, Add Host Capabilities'
              )}
            </Button>

            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="outline"
              className="w-full rounded-xl border-secondary-50/10 bg-secondary-800 py-3 text-base text-secondary-50/70 hover:bg-secondary-50/10"
              size="lg"
            >
              No, Keep as Renter Only
            </Button>
          </div>

          <div className="text-center pt-2">
            <Link href="/venues" className="text-sm font-medium text-secondary-50/50 hover:text-secondary-50/70">
              Browse Courts Instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
    </div>
  )
}

export default function UpgradeToHostPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UpgradeToHostContent />
    </Suspense>
  )
}

