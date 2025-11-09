'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border/40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500" />
          <span className="text-xl font-bold text-primary-800">PlayBookings</span>
        </Link>

        <div className="hidden md:flex md:items-center md:space-x-6">
          <Link
            href="/marketing"
            className={`text-sm font-medium transition-colors ${
              pathname === '/marketing'
                ? 'text-primary-700'
                : 'text-primary-500 hover:text-primary-700'
            }`}
          >
            Home
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-primary-500 transition-colors hover:text-primary-700"
          >
            Sign In
          </Link>
          <Button asChild className="rounded-xl">
            <Link href="/auth/register">Get Started</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <Button variant="ghost" size="sm" className="md:hidden text-primary-600 hover:text-primary-800">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>
      </div>
    </nav>
  )
}
