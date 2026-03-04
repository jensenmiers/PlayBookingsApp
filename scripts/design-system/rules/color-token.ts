import type { Finding } from '../types'

const NAMED_COLOR_UTILITY_PATTERN =
  /(^|[^A-Za-z0-9-])((?:[a-z-]+:)*(?:text|bg|border|from|to|via|ring|shadow|fill|stroke)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{1,3})?(?:\/\d{1,3})?)(?![A-Za-z0-9-])/g
const HEX_COLOR_PATTERN = /#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g
const COLOR_FUNCTION_PATTERN = /\b(?:rgb|rgba|hsl|hsla)\s*\(/g

export function checkColorTokenRule(source: string, file: string): Finding[] {
  const findings: Finding[] = []
  const lines = source.split(/\r?\n/)

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    NAMED_COLOR_UTILITY_PATTERN.lastIndex = 0
    let namedColorMatch: RegExpExecArray | null = NAMED_COLOR_UTILITY_PATTERN.exec(line)
    while (namedColorMatch) {
      const token = namedColorMatch[2]
      findings.push({
        rule: 'color-token',
        file,
        line: lineNumber,
        column: (namedColorMatch.index || 0) + 1,
        excerpt: token,
        message: `Use semantic or palette token utilities instead of named color utility "${token}".`,
      })
      namedColorMatch = NAMED_COLOR_UTILITY_PATTERN.exec(line)
    }

    HEX_COLOR_PATTERN.lastIndex = 0
    let hexMatch: RegExpExecArray | null = HEX_COLOR_PATTERN.exec(line)
    while (hexMatch) {
      const token = hexMatch[0]
      findings.push({
        rule: 'color-token',
        file,
        line: lineNumber,
        column: (hexMatch.index || 0) + 1,
        excerpt: token,
        message: `Use design tokens instead of raw color literal "${token}".`,
      })
      hexMatch = HEX_COLOR_PATTERN.exec(line)
    }

    COLOR_FUNCTION_PATTERN.lastIndex = 0
    let functionMatch: RegExpExecArray | null = COLOR_FUNCTION_PATTERN.exec(line)
    while (functionMatch) {
      const token = functionMatch[0]
      findings.push({
        rule: 'color-token',
        file,
        line: lineNumber,
        column: (functionMatch.index || 0) + 1,
        excerpt: token,
        message: `Use design tokens instead of color functions like "${token.trim()}".`,
      })
      functionMatch = COLOR_FUNCTION_PATTERN.exec(line)
    }
  })

  return findings
}
