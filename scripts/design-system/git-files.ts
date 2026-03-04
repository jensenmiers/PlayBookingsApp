import { execFileSync } from 'node:child_process'
import { normalizePath } from './scope'

interface UpstreamRange {
  baseRef: string
  upstreamRef: string | null
}

function runGit(args: string[], allowFailure = false): string {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    if (allowFailure) {
      return ''
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed git command: git ${args.join(' ')}\n${message}`)
  }
}

function splitLines(output: string): string[] {
  if (!output) {
    return []
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePath)
}

export function listTrackedFiles(): string[] {
  return splitLines(runGit(['ls-files']))
}

export function listStagedFiles(): string[] {
  return splitLines(runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']))
}

function resolveUpstreamRange(): UpstreamRange {
  const upstreamRef = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true)
  if (upstreamRef) {
    const mergeBase = runGit(['merge-base', 'HEAD', upstreamRef])
    return {
      baseRef: mergeBase,
      upstreamRef,
    }
  }

  const fallbackBase = runGit(['rev-parse', 'HEAD~1'], true)
  if (fallbackBase) {
    return {
      baseRef: fallbackBase,
      upstreamRef: null,
    }
  }

  const currentHead = runGit(['rev-parse', 'HEAD'])
  return {
    baseRef: currentHead,
    upstreamRef: null,
  }
}

export function listUnpushedFiles(): { files: string[]; baseRef: string; upstreamRef: string | null } {
  const range = resolveUpstreamRange()
  const files = splitLines(runGit(['diff', '--name-only', '--diff-filter=ACMR', `${range.baseRef}...HEAD`]))
  return {
    files,
    baseRef: range.baseRef,
    upstreamRef: range.upstreamRef,
  }
}

export function getStagedDiff(files: string[]): string {
  if (files.length === 0) {
    return ''
  }

  return runGit(['diff', '--cached', '--unified=0', '--', ...files])
}

export function getUnpushedDiff(baseRef: string, files: string[]): string {
  if (files.length === 0) {
    return ''
  }

  return runGit(['diff', '--unified=0', `${baseRef}...HEAD`, '--', ...files])
}
