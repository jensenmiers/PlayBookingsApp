import type { DropInTemplateWindow, OperatingHourWindow } from '@/types'

function normalizeTime(value: string): string | null {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    return `${value}:00`
  }
  return null
}

export function deriveRegularTemplateWindowsFromOperatingHours(
  operatingHours: OperatingHourWindow[] | null | undefined
): DropInTemplateWindow[] {
  if (!Array.isArray(operatingHours)) {
    return []
  }

  const unique = new Map<string, DropInTemplateWindow>()

  for (const window of operatingHours) {
    const day = Number(window.day_of_week)
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      continue
    }

    const start = normalizeTime(window.start_time)
    const end = normalizeTime(window.end_time)
    if (!start || !end || start >= end) {
      continue
    }

    const normalizedWindow: DropInTemplateWindow = {
      day_of_week: day,
      start_time: start,
      end_time: end,
    }
    unique.set(`${day}-${start}-${end}`, normalizedWindow)
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.day_of_week !== right.day_of_week) {
      return left.day_of_week - right.day_of_week
    }
    if (left.start_time !== right.start_time) {
      return left.start_time.localeCompare(right.start_time)
    }
    return left.end_time.localeCompare(right.end_time)
  })
}
