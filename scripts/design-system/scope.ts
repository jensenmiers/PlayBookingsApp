const DESIGN_SYSTEM_SCOPE_GROUPS = {
  marketplace: [
    'src/app/(auth)/',
    'src/app/auth/',
    'src/app/search/',
    'src/app/book/',
    'src/app/booking/',
    'src/app/venue/[name]/',
    'src/app/venues/',
    'src/components/auth/',
    'src/components/search/',
    'src/components/book/',
    'src/components/booking/',
    'src/components/bookings/',
    'src/components/forms/',
    'src/components/venue/',
    'src/components/venues/',
    'src/components/maps/',
  ],
  'super-admin': [
    'src/app/(dashboard)/super-admin/',
    'src/components/admin/',
  ],
  dashboard: [
    'src/app/(dashboard)/',
    'src/components/dashboard/',
  ],
} as const

const ACTIVE_SCOPE_GROUPS = ['marketplace', 'super-admin'] as const

const TEST_FILE_PATTERN = /(?:\.test\.[tj]sx?$|\.spec\.[tj]sx?$|\/__tests__\/)/
const TRACKED_EXT_PATTERN = /\.[tj]sx?$/

export type ScopeGroupName = keyof typeof DESIGN_SYSTEM_SCOPE_GROUPS

export interface ScopeFilterOptions {
  groups?: ScopeGroupName[]
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function getScopeGroupNames(): ScopeGroupName[] {
  return Object.keys(DESIGN_SYSTEM_SCOPE_GROUPS).sort() as ScopeGroupName[]
}

export function getActiveScopeGroups(): ScopeGroupName[] {
  return [...ACTIVE_SCOPE_GROUPS]
}

export function resolveScopeGroups(scopeGroupArg?: string | null): ScopeGroupName[] {
  if (!scopeGroupArg) {
    return getActiveScopeGroups()
  }

  const requestedGroups = scopeGroupArg
    .split(',')
    .map((group) => group.trim())
    .filter(Boolean)

  if (requestedGroups.length === 0) {
    return getActiveScopeGroups()
  }

  const validGroups = getScopeGroupNames()
  const unknownGroups = requestedGroups.filter(
    (group) => !validGroups.includes(group as ScopeGroupName)
  )

  if (unknownGroups.length > 0) {
    throw new Error(
      `Unknown design-system scope group(s): ${unknownGroups.join(', ')}. Valid groups: ${validGroups.join(', ')}`
    )
  }

  return requestedGroups as ScopeGroupName[]
}

function getScopePrefixes(groups: ScopeGroupName[]): string[] {
  return groups.flatMap((group) => [...DESIGN_SYSTEM_SCOPE_GROUPS[group]])
}

export function isInDesignSystemScope(filePath: string, options?: ScopeFilterOptions): boolean {
  const normalizedPath = normalizePath(filePath)
  const scopeGroups = options?.groups ?? getActiveScopeGroups()

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

  return getScopePrefixes(scopeGroups).some((prefix) => normalizedPath.startsWith(prefix))
}

export function filterScopedFiles(files: string[], options?: ScopeFilterOptions): string[] {
  return files.map(normalizePath).filter((file) => isInDesignSystemScope(file, options))
}
