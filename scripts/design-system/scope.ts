const APP_SCOPE_PREFIXES = [
  'src/app/search/',
  'src/app/book/',
  'src/app/booking/',
  'src/app/venue/',
  'src/app/venues/',
] as const

const COMPONENT_SCOPE_PREFIXES = [
  'src/components/search/',
  'src/components/book/',
  'src/components/booking/',
  'src/components/bookings/',
  'src/components/forms/',
  'src/components/venue/',
  'src/components/venues/',
  'src/components/maps/',
] as const

const TEST_FILE_PATTERN = /(?:\.test\.[tj]sx?$|\.spec\.[tj]sx?$|\/__tests__\/)/
const TRACKED_EXT_PATTERN = /\.[tj]sx$/

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function isInDesignSystemScope(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath)

  if (!TRACKED_EXT_PATTERN.test(normalizedPath)) {
    return false
  }

  if (TEST_FILE_PATTERN.test(normalizedPath)) {
    return false
  }

  if (
    normalizedPath.includes('/artifacts/') ||
    normalizedPath.includes('/output/') ||
    normalizedPath.startsWith('artifacts/') ||
    normalizedPath.startsWith('output/')
  ) {
    return false
  }

  return (
    APP_SCOPE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix)) ||
    COMPONENT_SCOPE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  )
}

export function filterScopedFiles(files: string[]): string[] {
  return files.map(normalizePath).filter(isInDesignSystemScope)
}
