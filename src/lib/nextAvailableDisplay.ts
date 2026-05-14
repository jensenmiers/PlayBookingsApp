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
  const dayLabel = parseLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
  const timeLabel = parseLocalTime(timeStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return `${dayLabel} ${timeLabel}`
}
