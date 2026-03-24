import { Skeleton } from '@/components/ui/skeleton'

export function VenueCardGridSkeleton() {
  return (
    <div className="bg-secondary-800 rounded-2xl shadow-soft overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-m space-y-xs">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-xs">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}
