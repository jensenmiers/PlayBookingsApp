import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_LINT_LOG_PATH = '/tmp/design-system-lint.log'

const SPACING_SCALE: Array<{ value: number; token: string }> = [
  { value: 0.5, token: 'xxs' },
  { value: 1, token: 'xs' },
  { value: 1.5, token: 's' },
  { value: 2, token: 's' },
  { value: 2.5, token: 'm' },
  { value: 3, token: 'm' },
  { value: 3.5, token: 'l' },
  { value: 4, token: 'l' },
  { value: 5, token: 'xl' },
  { value: 6, token: 'xl' },
  { value: 8, token: '2xl' },
  { value: 10, token: '3xl' },
  { value: 12, token: '4xl' },
  { value: 16, token: '5xl' },
  { value: 20, token: '6xl' },
]

const NAMED_FAMILY_TO_TOKEN_FAMILY: Record<string, string> = {
  gray: 'secondary',
  slate: 'secondary',
  zinc: 'secondary',
  neutral: 'secondary',
  stone: 'secondary',
  green: 'primary',
  emerald: 'primary',
  lime: 'primary',
  amber: 'accent',
  orange: 'accent',
  yellow: 'accent',
  blue: 'primary',
  cyan: 'primary',
  sky: 'primary',
  indigo: 'primary',
  violet: 'primary',
  purple: 'primary',
  fuchsia: 'primary',
  pink: 'primary',
  rose: 'primary',
}

const ALLOWED_RULES = new Set(['spacing-token', 'color-token'])

const SPACING_TOKEN_PATTERN = /\b((?:[a-z-]+:)*)(-?)(m|p|gap|space)([trblxy]?)-(-?\d+(?:\.\d+)?)\b/g
const NAMED_COLOR_TOKEN_PATTERN =
  /\b((?:[a-z-]+:)*)(bg|text|border|from|to|via|ring|shadow|fill|stroke)-(white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-(\d{1,3}))?(?:\/(\d{1,3}))?\b/g

interface CliOptions {
  mode: 'dry-run' | 'write'
  lintLogPath: string
}

interface FileFixResult {
  filePath: string
  spacingReplacements: number
  colorReplacements: number
  changed: boolean
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2)
  let mode: CliOptions['mode'] = 'dry-run'
  let lintLogPath = DEFAULT_LINT_LOG_PATH

  for (const arg of args) {
    if (arg === '--write') {
      mode = 'write'
      continue
    }

    if (arg.startsWith('--mode=')) {
      const parsedMode = arg.slice('--mode='.length)
      if (parsedMode === 'dry-run' || parsedMode === 'write') {
        mode = parsedMode
      }
      continue
    }

    if (arg.startsWith('--lint-log=')) {
      lintLogPath = arg.slice('--lint-log='.length)
    }
  }

  return {
    mode,
    lintLogPath,
  }
}

function parseTargetFilesFromLintLog(lintLogPath: string): string[] {
  if (!fs.existsSync(lintLogPath)) {
    throw new Error(`Lint log not found: ${lintLogPath}`)
  }

  const source = fs.readFileSync(lintLogPath, 'utf8')
  const fileSet = new Set<string>()

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^(src\/[^:]+):\d+:\d+\s+\[([^\]]+)\]/)
    if (!match) {
      continue
    }

    if (!ALLOWED_RULES.has(match[2])) {
      continue
    }

    fileSet.add(match[1])
  }

  return [...fileSet].sort()
}

function mapSpacingValueToToken(value: number): string {
  let closest = SPACING_SCALE[0]
  let closestDistance = Math.abs(value - closest.value)

  for (const candidate of SPACING_SCALE.slice(1)) {
    const distance = Math.abs(value - candidate.value)
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
      continue
    }

    if (distance === closestDistance && candidate.value > closest.value) {
      closest = candidate
      closestDistance = distance
    }
  }

  return closest.token
}

function remapSpacingToken(match: RegExpExecArray): string {
  const prefixes = match[1] ?? ''
  const leadingSign = match[2] ?? ''
  const utility = match[3]
  const axis = match[4] ?? ''
  const rawValue = match[5]

  const numericValue = Number(rawValue)
  if (!Number.isFinite(numericValue)) {
    return match[0]
  }

  if (numericValue === 0) {
    return `${prefixes}${leadingSign}${utility}${axis}-0`
  }

  const effectiveSign = leadingSign || (numericValue < 0 ? '-' : '')
  const mappedToken = mapSpacingValueToToken(Math.abs(numericValue))

  return `${prefixes}${effectiveSign}${utility}${axis}-${mappedToken}`
}

function remapRedToken(property: string): string {
  switch (property) {
    case 'text':
      return 'text-destructive'
    case 'bg':
      return 'bg-destructive/15'
    case 'border':
      return 'border-destructive/40'
    case 'ring':
      return 'ring-destructive'
    case 'shadow':
      return 'shadow-destructive/25'
    default:
      return `${property}-destructive`
  }
}

function remapColorToken(match: RegExpExecArray): string {
  const prefixes = match[1] ?? ''
  const property = match[2]
  const sourceFamily = match[3]
  const sourceShade = match[4]
  const sourceAlpha = match[5]

  if (sourceFamily === 'red') {
    return `${prefixes}${remapRedToken(property)}`
  }

  if (sourceFamily === 'white') {
    const alpha = sourceAlpha ? `/${sourceAlpha}` : ''
    return `${prefixes}${property}-secondary-50${alpha}`
  }

  if (sourceFamily === 'black') {
    const alpha = sourceAlpha ? `/${sourceAlpha}` : ''
    return `${prefixes}${property}-secondary-900${alpha}`
  }

  const targetFamily = NAMED_FAMILY_TO_TOKEN_FAMILY[sourceFamily]
  if (!targetFamily) {
    return match[0]
  }

  const shade = sourceShade ?? '500'
  const alpha = sourceAlpha ? `/${sourceAlpha}` : ''
  return `${prefixes}${property}-${targetFamily}-${shade}${alpha}`
}

function writeBackIfChanged(filePath: string, updated: string): void {
  fs.writeFileSync(path.resolve(process.cwd(), filePath), updated, 'utf8')
}

function processFile(filePath: string, mode: CliOptions['mode']): FileFixResult {
  const absolutePath = path.resolve(process.cwd(), filePath)
  const original = fs.readFileSync(absolutePath, 'utf8')

  let spacingReplacements = 0
  const withSpacing = original.replace(SPACING_TOKEN_PATTERN, (...args) => {
    const match = args[0] as string
    const captures = args.slice(0, 6) as string[]
    const remapped = remapSpacingToken(captures as unknown as RegExpExecArray)
    if (remapped !== match) {
      spacingReplacements += 1
    }
    return remapped
  })

  let colorReplacements = 0
  const withColor = withSpacing.replace(NAMED_COLOR_TOKEN_PATTERN, (...args) => {
    const match = args[0] as string
    const captures = args.slice(0, 6) as string[]
    const remapped = remapColorToken(captures as unknown as RegExpExecArray)
    if (remapped !== match) {
      colorReplacements += 1
    }
    return remapped
  })

  const changed = withColor !== original

  if (mode === 'write' && changed) {
    writeBackIfChanged(filePath, withColor)
  }

  return {
    filePath,
    spacingReplacements,
    colorReplacements,
    changed,
  }
}

function main(): void {
  const options = parseCliOptions()
  const targetFiles = parseTargetFilesFromLintLog(options.lintLogPath)

  if (targetFiles.length === 0) {
    console.log('No target files found in lint log. Nothing to do.')
    return
  }

  console.log(`Mode: ${options.mode}`)
  console.log(`Lint log: ${options.lintLogPath}`)
  console.log(`Target files: ${targetFiles.length}`)

  const results = targetFiles.map((filePath) => processFile(filePath, options.mode))
  const changed = results.filter((result) => result.changed)

  const spacingTotal = results.reduce((acc, current) => acc + current.spacingReplacements, 0)
  const colorTotal = results.reduce((acc, current) => acc + current.colorReplacements, 0)

  console.log(`Files changed: ${changed.length}`)
  console.log(`Spacing replacements: ${spacingTotal}`)
  console.log(`Color replacements: ${colorTotal}`)

  const topFiles = changed
    .map((result) => ({
      ...result,
      total: result.spacingReplacements + result.colorReplacements,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)

  if (topFiles.length > 0) {
    console.log('Top changed files:')
    topFiles.forEach((result) => {
      console.log(
        `- ${result.filePath}: spacing=${result.spacingReplacements}, color=${result.colorReplacements}`
      )
    })
  }
}

main()
