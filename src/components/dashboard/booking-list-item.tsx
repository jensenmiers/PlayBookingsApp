import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBasketball } from "@fortawesome/free-solid-svg-icons"

import { cn } from "@/lib/utils"
import type { BookingListItemData } from "@/types/dashboard"

export type BookingListItemProps = BookingListItemData & {
  iconBgClassName?: string
  className?: string
}

export function BookingListItem({
  venueName,
  durationLabel,
  renterName,
  renterAvatarUrl,
  amount,
  iconBgClassName,
  className,
}: BookingListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border/50 bg-white/90 p-4 shadow-soft transition-colors hover:bg-primary-50",
        className
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600",
          iconBgClassName
        )}
      >
        <FontAwesomeIcon icon={faBasketball} className="size-5" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h4 className="text-sm font-semibold text-primary-800">{venueName}</h4>
          <span className="text-xs font-medium text-muted-foreground">{durationLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative size-6 overflow-hidden rounded-full bg-primary-200">
              {renterAvatarUrl ? (
                <Image
                  src={renterAvatarUrl}
                  alt={renterName}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              ) : (
                <span className="grid size-full place-items-center text-[10px] font-semibold uppercase text-primary-700">
                  {renterName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-primary-700">{renterName}</span>
          </div>
          <span className="text-sm font-semibold text-secondary-600">{amount}</span>
        </div>
      </div>
    </div>
  )
}
