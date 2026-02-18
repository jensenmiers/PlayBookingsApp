'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"

import type { PerformanceChartDatum } from "@/types/dashboard"

export type PerformanceChartProps = {
  data: PerformanceChartDatum[]
  bookingsColor?: string
  revenueColor?: string
  className?: string
}

const PerformanceTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-secondary-50/10 bg-card px-3 py-2 text-xs text-secondary-50/70 shadow-soft">
        <p className="font-semibold">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>
              {entry.name}: <strong>{entry.value}</strong>
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function PerformanceChart({
  data,
  bookingsColor = "var(--chart-1)",
  revenueColor = "var(--chart-2)",
  className,
}: PerformanceChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={12}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--secondary-50)", fillOpacity: 0.6, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
          <YAxis tick={{ fill: "var(--secondary-50)", fillOpacity: 0.6, fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
          <Tooltip content={<PerformanceTooltip />} cursor={{ fill: "var(--secondary-50)", fillOpacity: 0.05 }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--secondary-50)", opacity: 0.6 }} />
          <Bar dataKey="bookings" radius={[8, 8, 0, 0]} fill={bookingsColor} />
          <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill={revenueColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
