import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCalendarCheck,
  faCheck,
  faMessage,
  faMoneyBillWave,
} from "@fortawesome/free-solid-svg-icons"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"

import { cn } from "@/lib/utils"
import type { ActivityItemData } from "@/types/dashboard"

export type ActivityType = "booking" | "payment" | "message" | "milestone"

export type ActivityItemProps = Omit<ActivityItemData, "type"> & {
  type?: ActivityType
  showConnector?: boolean
  className?: string
}

const TYPE_STYLES: Record<ActivityType, { container: string; icon: IconDefinition }> = {
  booking: {
    container: "bg-primary-100 text-primary-700",
    icon: faCalendarCheck,
  },
  payment: {
    container: "bg-accent-100 text-accent-700",
    icon: faMoneyBillWave,
  },
  message: {
    container: "bg-secondary-100 text-secondary-700",
    icon: faMessage,
  },
  milestone: {
    container: "bg-primary-100 text-primary-700",
    icon: faCheck,
  },
}

export function ActivityItem({
  title,
  description,
  timestampLabel,
  type = "milestone",
  showConnector = true,
  className,
}: ActivityItemProps) {
  const style = TYPE_STYLES[type]

  return (
    <div className={cn("flex", className)}>
      <div className="relative mr-4 flex w-10 flex-col items-center">
        <div
          className={cn(
            "z-10 flex size-10 items-center justify-center rounded-full",
            style.container
          )}
        >
          <FontAwesomeIcon icon={style.icon} className="size-4" />
        </div>
        {showConnector && (
          <div className="absolute top-10 bottom-0 w-px bg-border" aria-hidden />
        )}
      </div>
      <div className="flex-1 pb-6">
        <p className="text-sm font-semibold text-primary-800">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <p className="mt-1 text-xs text-muted-foreground/80">{timestampLabel}</p>
      </div>
    </div>
  )
}
