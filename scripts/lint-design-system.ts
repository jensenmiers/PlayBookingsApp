#!/usr/bin/env tsx

import fs from 'node:fs'
import { parseUnifiedDiff, filterFindingsToChangedLines } from './design-system/changed-lines'
import { parseExceptionDirectives, isRuleDisabled } from './design-system/exceptions'
import { buildLintInput } from './design-system/lint-input'
import {
  listTrackedFiles,
  listStagedFiles,
  listUnpushedFiles,
  getStagedDiff,
  getUnpushedDiff,
} from './design-system/git-files'
import { formatFindings } from './design-system/reporter'
import { checkColorTokenRule } from './design-system/rules/color-token'
import { checkFormWrapperRule } from './design-system/rules/form-wrapper'
import { checkSpacingTokenRule } from './design-system/rules/spacing-token'
import { normalizePath } from './design-system/scope'
import type { Finding, Mode, RuleName } from './design-system/types'

function parseMode(argv: string[]): Mode {
  const modeArg = argv.find((arg) => arg.startsWith('--mode='))
  const mode = modeArg?.split('=')[1] as Mode | undefined

  if (mode === 'all' || mode === 'staged' || mode === 'unpushed') {
    return mode
  }

  throw new Error('Usage: tsx scripts/lint-design-system.ts --mode=<all|staged|unpushed>')
}

function safeReadFile(relativePath: string): string | null {
  const normalizedPath = normalizePath(relativePath)
  if (!fs.existsSync(normalizedPath)) {
    return null
  }

  return fs.readFileSync(normalizedPath, 'utf8')
}

function runRules(source: string, file: string): Finding[] {
  return [
    ...checkSpacingTokenRule(source, file),
    ...checkColorTokenRule(source, file),
    ...checkFormWrapperRule(source, file),
  ]
}

function applyExceptionDirectives(source: string, file: string, findings: Finding[]): Finding[] {
  const directives = parseExceptionDirectives(source, file)
  const filteredRuleFindings = findings.filter(
    (finding) => !isRuleDisabled(directives, finding.rule as RuleName, finding.line)
  )

  return [...directives.findings, ...filteredRuleFindings]
}

function runAllMode(): { scopedFiles: string[]; diffText: string } {
  const { scopedFiles } = buildLintInput('all', listTrackedFiles())

  return {
    scopedFiles,
    diffText: '',
  }
}

function runStagedMode(): { scopedFiles: string[]; diffText: string } {
  const { scopedFiles, diffFiles } = buildLintInput('staged', listStagedFiles())
  const diffText = getStagedDiff(diffFiles)
  return { scopedFiles, diffText }
}

function runUnpushedMode(): { scopedFiles: string[]; diffText: string } {
  const { files, baseRef } = listUnpushedFiles()
  const { scopedFiles, diffFiles } = buildLintInput('unpushed', files)
  const diffText = getUnpushedDiff(baseRef, diffFiles)
  return { scopedFiles, diffText }
}

function collectModeFiles(mode: Mode): { scopedFiles: string[]; diffText: string } {
  if (mode === 'all') {
    return runAllMode()
  }

  if (mode === 'staged') {
    return runStagedMode()
  }

  return runUnpushedMode()
}

function main(): number {
  const mode = parseMode(process.argv.slice(2))
  const { scopedFiles, diffText } = collectModeFiles(mode)

  if (scopedFiles.length === 0) {
    console.log(`Design-system lint (${mode}): no scoped files to check.`)
    return 0
  }

  const findings: Finding[] = []

  for (const file of scopedFiles) {
    const source = safeReadFile(file)
    if (source === null) {
      continue
    }

    const ruleFindings = runRules(source, file)
    findings.push(...applyExceptionDirectives(source, file, ruleFindings))
  }

  const finalFindings =
    mode === 'all' ? findings : filterFindingsToChangedLines(findings, parseUnifiedDiff(diffText))

  if (finalFindings.length === 0) {
    console.log(`Design-system lint (${mode}): passed ${scopedFiles.length} file(s).`)
    return 0
  }

  console.error(`Design-system lint (${mode}) found ${finalFindings.length} violation(s):`)
  console.error(formatFindings(finalFindings))
  return 1
}

try {
  process.exitCode = main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
}
