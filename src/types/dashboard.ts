export type MetricPoint = {
  label: string
  value: number
}

export type StatsCardData = {
  title: string
  value: string
  subtext?: string
  delta?: number
  deltaLabel?: string
  trendData: MetricPoint[]
  trendColor?: string
}

export type BookingListItemData = {
  venueName: string
  durationLabel: string
  renterName: string
  renterAvatarUrl?: string
  amount: string
}

export type MessageCardData = {
  senderName: string
  senderAvatarUrl?: string
  timestampLabel: string
  messagePreview: string
}

export type ActivityItemData = {
  title: string
  description: string
  timestampLabel: string
  type?: 'booking' | 'payment' | 'message' | 'milestone'
}

export type PerformanceChartDatum = {
  name: string
  bookings: number
  revenue: number
}
