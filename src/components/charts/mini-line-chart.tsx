'use client'

import { useId } from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"

import type { MetricPoint } from "@/types/dashboard"

export type MiniLineChartPoint = MetricPoint

export type MiniLineChartProps = {
  data: MetricPoint[]
  color?: string
  fillOpacity?: number
  className?: string
}

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-primary-700 shadow-soft">
        <span className="font-semibold">{payload[0].value}</span>
      </div>
    )
  }
  return null
}

export function MiniLineChart({
  data,
  color = "var(--chart-1)",
  fillOpacity = 0.12,
  className,
}: MiniLineChartProps) {
  const gradientId = useId().replace(/:/g, "")

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.15, strokeWidth: 2 }}
            content={<CustomTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
