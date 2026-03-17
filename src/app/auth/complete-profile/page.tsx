'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import { navigateToUrl } from '@/lib/auth/clientNavigation'
import { sanitizeReturnTo } from '@/lib/auth/oauthFlow'

function CompleteProfileContent() {
  const searchParams = useSearchParams()
  const nextPath = sanitizeReturnTo(searchParams.get('next'))
  const { user, loading } = useCurrentUser()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSkip = () => {
    navigateToUrl(nextPath)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setErrorMessage('Sign in again before saving your phone number.')
      return
    }

    try {
      setSaving(true)
      setErrorMessage(null)
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        setErrorMessage(error.message)
        return
      }

      navigateToUrl(nextPath)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your phone number right now.'
      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-l">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-l">
      <Card className="w-full max-w-md border-secondary-50/10 bg-secondary-800 p-2xl shadow-soft">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-bold font-serif text-secondary-50">Add your phone number</CardTitle>
          <CardDescription className="text-secondary-50/60">
            We&apos;ll use it later for booking updates and reminders. You can skip this for now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-l text-sm text-secondary-50">
              {errorMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone number</Label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={saving} variant="outline" size="lg" className="w-full rounded-xl">
              {saving ? 'Saving...' : 'Save and continue'}
            </Button>
          </form>

          <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={handleSkip}>
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-l">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <CompleteProfileContent />
      </Suspense>
      <PublicSiteFooter />
    </div>
  )
}
