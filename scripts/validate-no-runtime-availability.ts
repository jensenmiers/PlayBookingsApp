#!/usr/bin/env tsx

import { execSync } from 'child_process'

const ALLOWED_LEGACY_PATHS = new Set([
  'src/repositories/availabilityRepository.ts',
])

function main() {
  let output = ''
  try {
    output = execSync(
      "rg -n \"from\\('availability'\\)\" src --glob '!**/__tests__/**'",
      { encoding: 'utf-8' }
    )
  } catch (error) {
    const execError = error as { status?: number; stdout?: string }
    if (execError.status === 1) {
      console.log('No runtime availability table reads detected.')
      return
    }
    throw error
  }

  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const disallowed = lines.filter((line) => {
    const path = line.split(':')[0]
    return !ALLOWED_LEGACY_PATHS.has(path)
  })

  if (disallowed.length > 0) {
    console.error('Disallowed runtime availability reads detected:')
    for (const line of disallowed) {
      console.error(`- ${line}`)
    }
    process.exit(1)
  }

  console.log('Only allowed legacy availability references remain:')
  for (const line of lines) {
    console.log(`- ${line}`)
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`Validation failed: ${message}`)
  process.exit(1)
}
