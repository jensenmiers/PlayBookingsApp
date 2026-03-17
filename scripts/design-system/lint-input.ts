import { filterScopedFiles } from './scope'
import type { Mode } from './types'

export interface LintInput {
  scopedFiles: string[]
  diffFiles: string[]
}

export function buildLintInput(mode: Mode, modeFiles: string[]): LintInput {
  const scopedFiles = filterScopedFiles(modeFiles)

  return {
    scopedFiles,
    diffFiles: mode === 'all' ? [] : scopedFiles,
  }
}
