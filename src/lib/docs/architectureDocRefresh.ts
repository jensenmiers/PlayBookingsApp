export const DATABASE_SNAPSHOT_START = '<!-- AUTO-SNAPSHOT:DB:START -->'
export const DATABASE_SNAPSHOT_END = '<!-- AUTO-SNAPSHOT:DB:END -->'
export const CSS_SNAPSHOT_START = '<!-- AUTO-SNAPSHOT:CSS:START -->'
export const CSS_SNAPSHOT_END = '<!-- AUTO-SNAPSHOT:CSS:END -->'
export const PACIFIC_TIME_ZONE = 'America/Los_Angeles'

export function replaceBetweenMarkers(
  content: string,
  startMarker: string,
  endMarker: string,
  replacement: string
): string {
  const startIndex = content.indexOf(startMarker)
  const endIndex = content.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Could not find valid marker pair: ${startMarker} ... ${endMarker}`)
  }

  const before = content.slice(0, startIndex + startMarker.length)
  const after = content.slice(endIndex)

  return `${before}\n${replacement}\n${after}`
}

export function extractSupabaseTables(source: string): string[] {
  const regex = /\.from\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g
  const tables = new Set<string>()
  let match = regex.exec(source)

  while (match) {
    tables.add(match[1])
    match = regex.exec(source)
  }

  return Array.from(tables).sort()
}

export function parseFontVariables(source: string): string[] {
  const regex = /variable:\s*['"](--font-[^'"]+)['"]/g
  const variables = new Set<string>()
  let match = regex.exec(source)

  while (match) {
    variables.add(match[1])
    match = regex.exec(source)
  }

  return Array.from(variables).sort()
}

export function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function updateLastVerifiedLine(content: string, date: string): string {
  return content.replace(/- Last verified: .*/g, `- Last verified: ${date} (${PACIFIC_TIME_ZONE})`)
}
