/**
 * Error Message Component
 * Reusable error display component for API errors
 */

'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  error: string | Error | null | undefined
  className?: string
  title?: string
}

export function ErrorMessage({ error, className, title = 'Error' }: ErrorMessageProps) {
  if (!error) return null

  const errorMessage = error instanceof Error ? error.message : String(error)

  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <FontAwesomeIcon
          icon={faCircleExclamation}
          className="text-destructive mt-0.5 flex-shrink-0"
        />
        <div className="flex-1">
          <h4 className="font-semibold text-destructive mb-1">{title}</h4>
          <p className="text-sm text-destructive/90">{errorMessage}</p>
        </div>
      </div>
    </div>
  )
}


