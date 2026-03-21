'use client'

import { Button } from '@/components/ui/button'
import { AuthLegalFooter } from '@/components/auth/auth-legal-footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'
import { buildAuthInitiationPath, buildEmailConfirmationPath } from '@/lib/auth/oauthFlow'
import { navigateToUrl } from '@/lib/auth/clientNavigation'
import { createClient } from '@/lib/supabase/client'
import { registerSchema } from '@/lib/validations/auth'

type SignupState = 'form' | 'verification'

function RegisterContent() {
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [signupState, setSignupState] = useState<SignupState>('form')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const isHostSignup = searchParams.get('intent') === 'host'
  const returnTo = searchParams.get('returnTo')
  const intent = searchParams.get('intent')

  const confirmationPath = useMemo(
    () => buildEmailConfirmationPath({
      next: returnTo,
      intent,
      phonePrompt: true,
    }),
    [intent, returnTo]
  )

  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      setInfoMessage(null)

      navigateToUrl(buildAuthInitiationPath({
        returnTo,
        intent,
      }))
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setInfoMessage(null)

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Enter your account details to continue.')
      return
    }

    try {
      setEmailLoading(true)
      const fullName = parsed.data.name.trim()
      const [firstName = '', ...lastNameParts] = fullName.split(/\s+/)
      const lastName = lastNameParts.join(' ')
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}${confirmationPath}`,
        },
      })

      const hasNoIdentities = Array.isArray(data.user?.identities) && data.user?.identities.length === 0
      if (error || hasNoIdentities) {
        setErrorMessage(
          'An account with this email already exists. Continue with Google if that is how you signed up, or sign in with your password.'
        )
        return
      }

      setSignupState('verification')
      setInfoMessage('Check your email to verify your account and finish setting up Play Bookings.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create your account right now.'
      setErrorMessage(message)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setErrorMessage('Enter your email address first so we know where to resend the verification link.')
      return
    }

    try {
      setResending(true)
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${confirmationPath}`,
        },
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setInfoMessage('Verification email resent. Check your inbox for the updated link.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to resend the verification email.'
      setErrorMessage(message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-l">
      <Card className="w-full max-w-md border-secondary-50/10 bg-secondary-800 p-2xl shadow-soft">
        <CardHeader className="space-y-3 text-center">
          {isHostSignup && (
            <div className="mx-auto mb-s inline-flex items-center gap-s rounded-full bg-primary-400/15 px-l py-s text-sm font-semibold text-primary-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Host Registration
            </div>
          )}
          <CardTitle className="text-2xl font-bold font-serif text-secondary-50">
            {isHostSignup ? 'Become a Host' : 'Welcome to Play Bookings!'}
          </CardTitle>
          {isHostSignup && (
            <CardDescription className="text-secondary-50/60">
              Create your host account to list your courts and start earning revenue
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-l text-sm text-secondary-50">
              {errorMessage}
            </div>
          )}
          {infoMessage && (
            <div className="rounded-lg border border-primary-400/30 bg-primary-400/10 p-l text-sm text-secondary-50">
              {infoMessage}
            </div>
          )}

          <Button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full rounded-xl bg-primary-400 py-m text-base text-secondary-900 hover:bg-primary-500"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-50 border-t-transparent" />
                <span>{isHostSignup ? 'Creating host account...' : 'Creating account...'}</span>
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

          <div className="flex items-center gap-s text-xs uppercase tracking-[0.24em] text-secondary-50/35">
            <div className="h-px flex-1 bg-secondary-50/10" />
            <span>or continue with email</span>
            <div className="h-px flex-1 bg-secondary-50/10" />
          </div>

          {signupState === 'form' ? (
            <form className="space-y-4" onSubmit={handleEmailSignup}>
              <div className="space-y-2">
                <Label htmlFor="register-name">Name</Label>
                <Input
                  id="register-name"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email address</Label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={emailLoading}
                variant="outline"
                size="lg"
                className="w-full rounded-xl py-m text-base"
              >
                {emailLoading
                  ? (isHostSignup ? 'Creating host account...' : 'Creating account...')
                  : 'Create Account'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 rounded-2xl border border-secondary-50/10 bg-secondary-900/60 p-xl text-center">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-secondary-50">Check your email</h2>
                <p className="text-sm text-secondary-50/65">
                  We sent a verification link to {email}. Once you confirm, we&apos;ll bring you back to finish
                  your setup.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Resending...' : 'Resend verification email'}
              </Button>
            </div>
          )}

          <AuthLegalFooter />

          <div className="text-center">
            <Link href="/" className="text-sm font-medium text-secondary-50/50 hover:text-secondary-50/70">
              Back to Home
            </Link>
          </div>
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

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <RegisterContent />
      </Suspense>
      <PublicSiteFooter />
    </div>
  )
}
