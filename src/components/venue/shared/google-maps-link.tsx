'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface GoogleMapsLinkProps {
  address: string
  city: string
  state: string
  zipCode: string
  className?: string
  variant?: 'default' | 'compact' | 'pill' | 'minimal'
  showIcon?: boolean
  showArrow?: boolean
  stackAddressOnMobile?: boolean
}

export function GoogleMapsLink({
  address,
  city,
  state,
  zipCode,
  className,
  variant = 'default',
  showIcon = true,
  showArrow = false,
  stackAddressOnMobile = false,
}: GoogleMapsLinkProps) {
  const fullAddress = `${address}, ${city}, ${state} ${zipCode}`
  const cityStateZip = `${city}, ${state} ${zipCode}`
  const encodedAddress = encodeURIComponent(fullAddress)
  const mapsUrl = `https://maps.google.com/?q=${encodedAddress}`

  const handleClick = () => {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const variants = {
    default: 'flex items-center gap-2 text-secondary-50/60 hover:text-secondary-50 transition-colors cursor-pointer',
    compact: 'flex items-center gap-1.5 text-sm text-secondary-50/60 hover:text-secondary-50 transition-colors cursor-pointer',
    pill: 'inline-flex items-center gap-2 px-3 py-1.5 bg-secondary-50/5 hover:bg-secondary-50/10 rounded-full text-sm text-secondary-50/70 hover:text-secondary-50 transition-all cursor-pointer',
    minimal: 'text-secondary-50/60 hover:text-secondary-50 underline underline-offset-2 cursor-pointer transition-colors',
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        variants[variant],
        variant === 'default' && stackAddressOnMobile && 'w-full justify-center sm:justify-start',
        className
      )}
      aria-label={`Open ${fullAddress} in Google Maps`}
    >
      {showIcon && variant !== 'minimal' && (
        <FontAwesomeIcon
          icon={faLocationDot}
          className={cn(
            variant === 'pill' ? 'text-primary-400' : 'text-secondary-50/50'
          )}
        />
      )}
      {variant === 'default' && stackAddressOnMobile ? (
        <span>
          <span className="block text-center leading-tight sm:hidden">{address}</span>
          <span className="block text-center leading-tight sm:hidden">{cityStateZip}</span>
          <span className="hidden sm:inline">{fullAddress}</span>
        </span>
      ) : (
        <span className={variant === 'pill' ? 'truncate max-w-[200px]' : ''}>
          {variant === 'compact' || variant === 'pill'
            ? `${address}, ${city}`
            : fullAddress}
        </span>
      )}
      {showArrow && (
        <FontAwesomeIcon
          icon={faArrowUpRightFromSquare}
          className="text-xs opacity-60"
        />
      )}
    </button>
  )
}
