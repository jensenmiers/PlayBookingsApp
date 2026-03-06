import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/become-a-host', label: 'List your court' },
  { href: '/venues', label: 'All courts' },
  { href: '/privacy', label: 'Privacy Policy' },
]

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-secondary-50/10 px-6 py-8 sm:px-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-secondary-50/40 sm:flex-row">
        <span>Play Bookings © 2026</span>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-secondary-50">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
