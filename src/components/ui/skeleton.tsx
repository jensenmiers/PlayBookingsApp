import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-secondary-200', className)}
      {...props}
    />
  )
}

export { Skeleton }

