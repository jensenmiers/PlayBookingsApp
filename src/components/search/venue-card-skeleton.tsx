import { Skeleton } from '@/components/ui/skeleton'

export function VenueCardSkeleton() {
  return (
    <div className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden">
      <div className="flex">
        {/* Image skeleton - left 1/3 */}
        <div className="w-1/3 h-[120px] relative">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
        {/* Content skeleton - right 2/3 */}
        <div className="w-2/3 p-4">
          {/* Title skeleton */}
          <Skeleton className="h-5 w-3/4 mb-2" />
          {/* Location skeleton */}
          <Skeleton className="h-4 w-1/2 mb-1" />
          {/* Price skeleton */}
          <Skeleton className="h-4 w-1/3 mb-2" />
          {/* Amenities skeleton */}
          <div className="flex space-x-2 mb-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          {/* Button skeleton */}
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

