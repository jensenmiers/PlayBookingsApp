import { Skeleton } from '@/components/ui/skeleton'

export function TicketSkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <Skeleton className="h-[40vh] sm:h-[45vh] md:h-[50vh] -mx-6 lg:-mx-10 rounded-none" />

      {/* Ticket card skeleton */}
      <div className="relative -mt-6 z-10 bg-secondary-800/90 rounded-2xl border border-secondary-50/10 shadow-glass mx-0 sm:mx-4 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Status banner */}
          <Skeleton className="h-14 rounded-lg" />

          {/* Date/time */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-60 mt-3" />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-3 w-12 mb-2" />
              <Skeleton className="h-9 w-56 rounded-full" />
            </div>
            <div>
              <Skeleton className="h-3 w-10 mb-2" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>

          {/* Tear line */}
          <div className="border-t-2 border-dashed border-secondary-50/5 my-6" />

          {/* Actions */}
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
