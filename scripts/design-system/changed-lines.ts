import { normalizePath } from './scope'
import type { Finding } from './types'

export type ChangedLineMap = Map<string, Set<number>>

const HUNK_PATTERN = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

function getOrCreateLineSet(changedLines: ChangedLineMap, file: string): Set<number> {
  const existing = changedLines.get(file)
  if (existing) {
    return existing
  }

  const created = new Set<number>()
  changedLines.set(file, created)
  return created
}

export function parseUnifiedDiff(diffText: string): ChangedLineMap {
  const changedLines: ChangedLineMap = new Map()
  const lines = diffText.split(/\r?\n/)

  let currentFile: string | null = null

  for (const line of lines) {
    if (line.startsWith('+++ ')) {
      const nextFile = line.slice(4).trim()
      if (!nextFile || nextFile === '/dev/null') {
        currentFile = null
        continue
      }

      currentFile = normalizePath(nextFile.replace(/^b\//, ''))
      continue
    }

    if (!line.startsWith('@@ ') || !currentFile) {
      continue
    }

    const match = HUNK_PATTERN.exec(line)
    if (!match) {
      continue
    }

    const startLine = Number(match[1])
    const count = match[2] === undefined ? 1 : Number(match[2])

    if (!Number.isFinite(startLine) || !Number.isFinite(count) || count <= 0) {
      continue
    }

    const lineSet = getOrCreateLineSet(changedLines, currentFile)
    for (let offset = 0; offset < count; offset += 1) {
      lineSet.add(startLine + offset)
    }
  }

  return changedLines
}

export function filterFindingsToChangedLines(
  findings: Finding[],
  changedLines: ChangedLineMap
): Finding[] {
  return findings.filter((finding) => {
    const fileLines = changedLines.get(normalizePath(finding.file))
    if (!fileLines) {
      return false
    }

    return fileLines.has(finding.line)
  })
}
