function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function parseLocalTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export function formatCompactNextAvailable(dateStr: string, timeStr: string): string {
  const date = parseLocalDate(dateStr)
  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const [, minutes = 0] = timeStr.split(':').map(Number)
  const timeLabel = parseLocalTime(timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: minutes === 0 ? undefined : '2-digit',
    hour12: true,
  })

  return `${dayLabel} ${dateLabel}, ${timeLabel}`
}
