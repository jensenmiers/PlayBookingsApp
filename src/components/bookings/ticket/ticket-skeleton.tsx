import { Skeleton } from '@/components/ui/skeleton'

export function TicketSkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <Skeleton className="h-[40vh] sm:h-[45vh] md:h-[50vh] -mx-xl lg:-mx-3xl rounded-none" />

      {/* Ticket card skeleton */}
      <div className="relative -mt-xl z-10 bg-secondary-800/90 rounded-2xl border border-secondary-50/10 shadow-glass mx-0 sm:mx-l overflow-hidden">
        <div className="p-xl space-y-6">
          {/* Status banner */}
          <Skeleton className="h-14 rounded-lg" />

          {/* Date/time */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-60 mt-m" />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <Skeleton className="h-3 w-12 mb-s" />
              <Skeleton className="h-9 w-56 rounded-full" />
            </div>
            <div>
              <Skeleton className="h-3 w-10 mb-s" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>

          {/* Tear line */}
          <div className="border-t-2 border-dashed border-secondary-50/5 my-xl" />

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
