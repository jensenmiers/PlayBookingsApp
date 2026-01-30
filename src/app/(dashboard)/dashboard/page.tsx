import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faChevronDown } from '@fortawesome/free-solid-svg-icons'

import { ActivityItem } from '@/components/dashboard/activity-item'
import { BookingListItem } from '@/components/dashboard/booking-list-item'
import { MessageCard, type MessageAction } from '@/components/dashboard/message-card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { PerformanceChart } from '@/components/charts/performance-chart'
import { Button } from '@/components/ui/button'
import type {
  ActivityItemData,
  BookingListItemData,
  MessageCardData,
  PerformanceChartDatum,
  StatsCardData,
} from '@/types/dashboard'

const statsCards: StatsCardData[] = [
  {
    title: 'Total Earnings',
    value: '$8,245',
    subtext: 'From 184 bookings',
    delta: 12.5,
    deltaLabel: 'vs last month',
    trendData: [
      { label: 'Day 1', value: 65 },
      { label: 'Day 2', value: 80 },
      { label: 'Day 3', value: 75 },
      { label: 'Day 4', value: 90 },
      { label: 'Day 5', value: 85 },
      { label: 'Day 6', value: 95 },
      { label: 'Day 7', value: 100 },
    ],
    trendColor: 'var(--secondary-600)',
  },
  {
    title: 'Upcoming Bookings',
    value: '27',
    subtext: 'Next 7 days',
    delta: 4.2,
    deltaLabel: 'vs last week',
    trendData: [
      { label: 'Day 1', value: 20 },
      { label: 'Day 2', value: 25 },
      { label: 'Day 3', value: 22 },
      { label: 'Day 4', value: 27 },
      { label: 'Day 5', value: 23 },
      { label: 'Day 6', value: 25 },
      { label: 'Day 7', value: 27 },
    ],
    trendColor: 'var(--chart-1)',
  },
  {
    title: 'Court Utilization',
    value: '72%',
    subtext: 'Average occupancy',
    delta: 8.3,
    deltaLabel: 'vs target',
    trendData: [
      { label: 'Day 1', value: 60 },
      { label: 'Day 2', value: 65 },
      { label: 'Day 3', value: 70 },
      { label: 'Day 4', value: 68 },
      { label: 'Day 5', value: 72 },
      { label: 'Day 6', value: 70 },
      { label: 'Day 7', value: 72 },
    ],
    trendColor: 'var(--chart-5)',
  },
]

const upcomingBookings: BookingListItemData[] = [
  {
    venueName: 'Downtown Court #2',
    durationLabel: '2 hours',
    renterName: 'Sarah Johnson',
    renterAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    amount: '$85.00',
  },
  {
    venueName: 'Riverside Gym - Full Court',
    durationLabel: '3 hours',
    renterName: 'James Wilson',
    renterAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    amount: '$120.00',
  },
  {
    venueName: 'Downtown Court #1',
    durationLabel: '1.5 hours',
    renterName: 'Robert Chen',
    renterAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg',
    amount: '$65.00',
  },
  {
    venueName: 'Riverside Gym - Half Court',
    durationLabel: '2 hours',
    renterName: 'Emily Parker',
    renterAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    amount: '$70.00',
  },
]

const recentMessages: Array<MessageCardData & { actions: MessageAction[] }> = [
  {
    senderName: 'Sarah Johnson',
    senderAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    timestampLabel: '2h ago',
    messagePreview:
      'Hi, I was wondering if we could reschedule our booking for tomorrow to 5pm instead of 3pm?',
    actions: [
      { type: 'decline', label: 'Decline' },
      { type: 'accept', label: 'Accept' },
    ],
  },
  {
    senderName: 'Robert Chen',
    senderAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg',
    timestampLabel: '5h ago',
    messagePreview:
      'Is it possible to bring an extra person to our session? There would be 6 of us total.',
    actions: [{ type: 'reply', label: 'Reply' }],
  },
  {
    senderName: 'James Wilson',
    senderAvatarUrl: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    timestampLabel: '1d ago',
    messagePreview:
      'Thanks for approving our booking! Looking forward to playing at your court.',
    actions: [{ type: 'reply', label: 'Reply' }],
  },
]

const recentActivity: ActivityItemData[] = [
  {
    title: 'New booking confirmed',
    description: 'Downtown Court #1 · Robert Chen',
    timestampLabel: 'Today, 10:23 AM',
    type: 'booking',
  },
  {
    title: 'Payment received',
    description: '$120.00 · Riverside Gym',
    timestampLabel: 'Today, 9:15 AM',
    type: 'payment',
  },
  {
    title: 'New message',
    description: 'From Sarah Johnson',
    timestampLabel: 'Today, 8:47 AM',
    type: 'message',
  },
  {
    title: 'Booking completed',
    description: 'Downtown Court #2 · Team League',
    timestampLabel: 'Yesterday, 7:30 PM',
    type: 'milestone',
  },
]

const performanceData: PerformanceChartDatum[] = [
  { name: 'Downtown Court #1', bookings: 42, revenue: 1850 },
  { name: 'Downtown Court #2', bookings: 38, revenue: 1620 },
  { name: 'Riverside Gym - Full', bookings: 65, revenue: 3250 },
  { name: 'Riverside Gym - Half', bookings: 39, revenue: 1525 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-secondary-800">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, Michael! Here’s what’s happening with your facilities.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-secondary-700 transition-colors hover:text-secondary-900">
            <FontAwesomeIcon icon={faBell} className="size-5" />
            <span className="absolute -top-2 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              2
            </span>
          </button>
          <Button
            variant="outline"
            className="inline-flex items-center gap-2 rounded-xl border-border/60 bg-white/90 px-4 py-2 text-sm font-semibold text-secondary-700 hover:bg-secondary-100"
          >
            <span>Last 30 days</span>
            <FontAwesomeIcon icon={faChevronDown} className="size-3" />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statsCards.map((card) => (
          <StatsCard key={card.title} {...card} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-white/95 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-secondary-800">Upcoming Bookings</h2>
            <button className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <BookingListItem key={`${booking.venueName}-${booking.renterName}`} {...booking} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-secondary-800">Recent Messages</h2>
            <button className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentMessages.map((message) => (
              <MessageCard key={`${message.senderName}-${message.timestampLabel}`} {...message} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white/95 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-secondary-800 mb-6">Recent Activity</h2>
          <div>
            {recentActivity.map((activity, index) => (
              <ActivityItem
                key={`${activity.title}-${activity.timestampLabel}`}
                {...activity}
                showConnector={index !== recentActivity.length - 1}
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-white/95 p-6 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-secondary-800">Listing Performance</h2>
            <Button
              variant="outline"
              className="inline-flex items-center gap-2 rounded-xl border-border/60 bg-secondary-50 px-4 py-2 text-sm font-semibold text-secondary-700 hover:bg-secondary-100"
            >
              <span>Last 30 days</span>
              <FontAwesomeIcon icon={faChevronDown} className="size-3" />
            </Button>
          </div>
          <div className="h-[300px]">
            <PerformanceChart data={performanceData} />
          </div>
        </div>
      </section>
    </div>
  )
}
