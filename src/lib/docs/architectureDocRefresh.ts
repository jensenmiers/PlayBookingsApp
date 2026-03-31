import { join } from 'path'

export const DATABASE_SNAPSHOT_START = '<!-- AUTO-SNAPSHOT:DB:START -->'
export const DATABASE_SNAPSHOT_END = '<!-- AUTO-SNAPSHOT:DB:END -->'
export const CSS_SNAPSHOT_START = '<!-- AUTO-SNAPSHOT:CSS:START -->'
export const CSS_SNAPSHOT_END = '<!-- AUTO-SNAPSHOT:CSS:END -->'
export const PACIFIC_TIME_ZONE = 'America/Los_Angeles'
export const ARCHITECTURE_DOC_REFRESH_AUTOMATION_ID = 'refresh-architecture-docs'
export const DEFAULT_PROJECT_STATE_PATH_SEGMENTS = ['.codex', 'architecture-doc-refresh-state.json'] as const

export type SnapshotChange = {
  label: string
  previous: string
  next: string
}

export type RefreshState = {
  lastRunAt: string
  lastSuccessfulRunAt: string
}

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

export function extractBetweenMarkers(content: string, startMarker: string, endMarker: string): string {
  const startIndex = content.indexOf(startMarker)
  const endIndex = content.indexOf(endMarker)

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Could not find valid marker pair: ${startMarker} ... ${endMarker}`)
  }

  return content.slice(startIndex + startMarker.length, endIndex).trim()
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

function parseSnapshotEntry(line: string): { label: string; value: string } | null {
  const match = line.match(/^- ([^:]+):\s*(.*)$/)
  if (!match) {
    return null
  }

  return {
    label: match[1].trim(),
    value: match[2].trim(),
  }
}

export function summarizeSnapshotChanges(
  previousSnapshot: string,
  nextSnapshot: string,
  ignoredLabels: string[] = ['Generated at']
): SnapshotChange[] {
  const ignored = new Set(ignoredLabels)
  const previousEntries = new Map<string, string>()
  const nextEntries = new Map<string, string>()

  for (const line of previousSnapshot.split('\n')) {
    const entry = parseSnapshotEntry(line.trim())
    if (entry && !ignored.has(entry.label)) {
      previousEntries.set(entry.label, entry.value)
    }
  }

  for (const line of nextSnapshot.split('\n')) {
    const entry = parseSnapshotEntry(line.trim())
    if (entry && !ignored.has(entry.label)) {
      nextEntries.set(entry.label, entry.value)
    }
  }

  const labels = Array.from(new Set([...previousEntries.keys(), ...nextEntries.keys()])).sort()

  return labels
    .filter((label) => previousEntries.get(label) !== nextEntries.get(label))
    .map((label) => ({
      label,
      previous: previousEntries.get(label) ?? 'none',
      next: nextEntries.get(label) ?? 'none',
    }))
}

export function summarizeDocChanges(
  previousDoc: string,
  nextDoc: string,
  snapshotStart: string,
  snapshotEnd: string,
  ignoredLabels: string[] = ['Generated at']
): SnapshotChange[] {
  return summarizeSnapshotChanges(
    extractBetweenMarkers(previousDoc, snapshotStart, snapshotEnd),
    extractBetweenMarkers(nextDoc, snapshotStart, snapshotEnd),
    ignoredLabels
  )
}

export function hasSubstantiveDocChanges(
  previousDoc: string,
  nextDoc: string,
  snapshotStart: string,
  snapshotEnd: string
): boolean {
  return summarizeDocChanges(previousDoc, nextDoc, snapshotStart, snapshotEnd).length > 0
}

export function serializeRefreshState(state: RefreshState): string {
  return `${JSON.stringify(state, null, 2)}\n`
}

export function parseRefreshState(content: string): RefreshState | null {
  try {
    const parsed = JSON.parse(content) as Partial<RefreshState>
    if (typeof parsed.lastRunAt !== 'string' || typeof parsed.lastSuccessfulRunAt !== 'string') {
      return null
    }

    return {
      lastRunAt: parsed.lastRunAt,
      lastSuccessfulRunAt: parsed.lastSuccessfulRunAt,
    }
  } catch {
    return null
  }
}

export function resolveArchitectureDocRefreshStatePath(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const explicitPath = env.ARCHITECTURE_DOCS_STATE_PATH?.trim()
  if (explicitPath) {
    return explicitPath
  }

  const codexHome = env.CODEX_HOME?.trim()
  if (codexHome) {
    return join(codexHome, 'automations', ARCHITECTURE_DOC_REFRESH_AUTOMATION_ID, 'last-run.json')
  }

  return join(projectRoot, ...DEFAULT_PROJECT_STATE_PATH_SEGMENTS)
}
