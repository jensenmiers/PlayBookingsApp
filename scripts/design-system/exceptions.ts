import type { Finding, RuleName } from './types'

export interface ExceptionDirectives {
  disabledByLine: Map<number, Set<RuleName>>
  findings: Finding[]
}

const DIRECTIVE_PATTERN = /design-lint-disable-next-line\s+([a-z-]+)(?:\s*--\s*(.+))?/
const ALLOWED_RULES = new Set<RuleName>(['spacing-token', 'color-token', 'form-wrapper'])

function toRuleName(rule: string): RuleName | null {
  return ALLOWED_RULES.has(rule as RuleName) ? (rule as RuleName) : null
}

function createExceptionFinding(file: string, line: number, message: string, excerpt?: string): Finding {
  return {
    rule: 'exception-format',
    message,
    file,
    line,
    excerpt,
  }
}

export function parseExceptionDirectives(source: string, file: string): ExceptionDirectives {
  const disabledByLine = new Map<number, Set<RuleName>>()
  const findings: Finding[] = []
  const lines = source.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (!line.includes('design-lint-disable-next-line')) {
      return
    }

    const lineNumber = index + 1
    const match = DIRECTIVE_PATTERN.exec(line)
    if (!match) {
      findings.push(
        createExceptionFinding(
          file,
          lineNumber,
          'Invalid exception marker. Use: design-lint-disable-next-line <rule> -- <reason>',
          line.trim()
        )
      )
      return
    }

    const parsedRule = toRuleName(match[1])
    if (!parsedRule) {
      findings.push(
        createExceptionFinding(
          file,
          lineNumber,
          `Unknown rule "${match[1]}" in exception marker.`,
          line.trim()
        )
      )
      return
    }

    const reason = (match[2] ?? '').trim()
    if (!reason) {
      findings.push(
        createExceptionFinding(
          file,
          lineNumber,
          'Exception marker requires a non-empty reason after "--".',
          line.trim()
        )
      )
      return
    }

    const targetLine = lineNumber + 1
    const disabledForLine = disabledByLine.get(targetLine) ?? new Set<RuleName>()
    disabledForLine.add(parsedRule)
    disabledByLine.set(targetLine, disabledForLine)
  })

  return { disabledByLine, findings }
}

export function isRuleDisabled(
  directives: ExceptionDirectives,
  rule: RuleName,
  line: number
): boolean {
  const disabledForLine = directives.disabledByLine.get(line)
  if (!disabledForLine) {
    return false
  }

  return disabledForLine.has(rule)
}
