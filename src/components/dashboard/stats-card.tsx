import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowTrendDown, faArrowTrendUp } from "@fortawesome/free-solid-svg-icons"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MiniLineChart } from "@/components/charts/mini-line-chart"
import type { StatsCardData } from "@/types/dashboard"

export type StatsCardProps = StatsCardData & {
  className?: string
}

export function StatsCard({
  title,
  value,
  subtext,
  delta,
  deltaLabel,
  trendData,
  trendColor,
  className,
}: StatsCardProps) {
  const trendDirection =
    delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat"
  const formattedDelta =
    delta === undefined ? null : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`

  return (
    <Card className={cn("bg-card text-card-foreground border-border/60 shadow-soft", className)}>
      <CardHeader className="flex items-start justify-between gap-4 p-0">
        <CardTitle className="text-sm font-medium text-secondary-600">{title}</CardTitle>
        {formattedDelta && trendDirection && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              trendDirection === "up" && "bg-primary-100 text-primary-700",
              trendDirection === "down" && "bg-accent-100 text-accent-700",
              trendDirection === "flat" && "bg-muted text-muted-foreground"
            )}
          >
            {trendDirection !== "flat" && (
              <FontAwesomeIcon
                icon={trendDirection === "down" ? faArrowTrendDown : faArrowTrendUp}
                className={cn("size-3.5", trendDirection === "down" && "text-accent-600")}
              />
            )}
            <span>{formattedDelta}</span>
            {deltaLabel && <span className="text-muted-foreground/70">{deltaLabel}</span>}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-6 p-0">
        <div>
          <p className="text-3xl font-semibold text-secondary-800">{value}</p>
          {subtext && <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>}
        </div>
        <div className="h-20 w-28">
          <MiniLineChart data={trendData} color={trendColor} />
        </div>
      </CardContent>
    </Card>
  )
}
