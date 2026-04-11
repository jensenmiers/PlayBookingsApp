import { filterScopedFiles } from './scope'
import type { Mode } from './types'
import type { ScopeGroupName } from './scope'

export interface LintInput {
  scopedFiles: string[]
  diffFiles: string[]
}

export interface LintInputOptions {
  groups?: ScopeGroupName[]
}

export function buildLintInput(mode: Mode, modeFiles: string[], options?: LintInputOptions): LintInput {
  const scopedFiles = filterScopedFiles(modeFiles, options)

  return {
    scopedFiles,
    diffFiles: mode === 'all' ? [] : scopedFiles,
  }
}
