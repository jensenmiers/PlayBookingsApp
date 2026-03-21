import Link from 'next/link'

type AuthLegalFooterProps = {
  className?: string
}

export function AuthLegalFooter({
  className = 'space-y-2 text-center text-sm text-secondary-50/60',
}: AuthLegalFooterProps) {
  return (
    <div className={className}>
      <p>
        By continuing, you agree to our{' '}
        <Link href="/privacy" className="font-semibold text-secondary-50/70 hover:text-primary-400">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
