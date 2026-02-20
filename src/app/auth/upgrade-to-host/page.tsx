'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  HOST_ONBOARDING_UNAVAILABLE_DESCRIPTION,
  HOST_ONBOARDING_UNAVAILABLE_TITLE,
} from '@/lib/hostOnboarding'

export default function UpgradeToHostPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-secondary-50/10 bg-secondary-800 p-8 shadow-soft">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-400/15 text-primary-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold font-serif text-secondary-50">
            {HOST_ONBOARDING_UNAVAILABLE_TITLE}
          </CardTitle>
          <CardDescription className="text-secondary-50/60">
            {HOST_ONBOARDING_UNAVAILABLE_DESCRIPTION}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button asChild className="w-full rounded-xl bg-primary-400 py-3 text-base text-secondary-900 hover:bg-primary-500" size="lg">
            <Link href="/venues">Browse Courts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
