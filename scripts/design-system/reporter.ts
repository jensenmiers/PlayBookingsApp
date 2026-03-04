import type { Finding } from './types'

export function formatFindings(findings: Finding[]): string {
  const sorted = [...findings].sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file)
    }
    if (a.line !== b.line) {
      return a.line - b.line
    }
    return (a.column ?? 1) - (b.column ?? 1)
  })

  return sorted
    .map((finding) => {
      const columnPart = finding.column ? `:${finding.column}` : ''
      const excerptPart = finding.excerpt ? `\n    -> ${finding.excerpt}` : ''
      return `${finding.file}:${finding.line}${columnPart} [${finding.rule}] ${finding.message}${excerptPart}`
    })
    .join('\n')
}
