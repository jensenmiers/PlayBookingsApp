import Link from 'next/link'
import { Navigation } from '@/components/layout/navigation'
import { PublicSiteFooter } from '@/components/layout/public-site-footer'

type BreadcrumbItem = { href?: string; label: string }

type LandingPageShellProps = {
  breadcrumbs?: BreadcrumbItem[]
  h1: string
  intro: string
  children: React.ReactNode
}

export function LandingPageShell({ breadcrumbs, h1, intro, children }: LandingPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary-900 text-secondary-50">
      <Navigation />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-10">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-6 flex flex-wrap items-center gap-xs text-sm text-secondary-50/50" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="flex items-center gap-xs">
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-secondary-50">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {i < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}

        <header className="mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl">{h1}</h1>
          <p className="mt-4 max-w-2xl text-secondary-50/70">{intro}</p>
        </header>

        {children}
      </main>
      <PublicSiteFooter />
    </div>
  )
}
