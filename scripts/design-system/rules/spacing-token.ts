import type { Finding } from '../types'

const NUMERIC_SPACING_PATTERN =
  /(^|[^A-Za-z0-9-])((?:[a-z-]+:)*-?(?:m|p|gap|space)(?:[trblxy])?-(?:-?\d+(?:\.\d+)?))(?![A-Za-z0-9-])/g
const SPACING_TOKEN_MESSAGE =
  'Use semantic spacing tokens (xxs/xs/s/m/l/xl/2xl/3xl/4xl/5xl/6xl) instead of numeric utility'

function isAllowedNumericValue(token: string): boolean {
  const utilityToken = token.split(':').pop() ?? token
  const valueMatch = utilityToken.match(/-(\-?\d+(?:\.\d+)?)$/)
  if (!valueMatch) {
    return false
  }

  const numericValue = Number(valueMatch[1])
  return Number.isFinite(numericValue) && numericValue === 0
}

export function checkSpacingTokenRule(source: string, file: string): Finding[] {
  const findings: Finding[] = []
  const lines = source.split(/\r?\n/)

  lines.forEach((line, index) => {
    NUMERIC_SPACING_PATTERN.lastIndex = 0

    let match: RegExpExecArray | null = NUMERIC_SPACING_PATTERN.exec(line)
    while (match) {
      const token = match[2]
      if (!isAllowedNumericValue(token)) {
        findings.push({
          rule: 'spacing-token',
          file,
          line: index + 1,
          column: (match.index || 0) + 1,
          excerpt: token,
          message: `${SPACING_TOKEN_MESSAGE} "${token}".`,
        })
      }

      match = NUMERIC_SPACING_PATTERN.exec(line)
    }
  })

  return findings
}
