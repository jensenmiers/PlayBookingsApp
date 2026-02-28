#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve, relative } from 'path'
import {
  CSS_SNAPSHOT_END,
  CSS_SNAPSHOT_START,
  DATABASE_SNAPSHOT_END,
  DATABASE_SNAPSHOT_START,
  PACIFIC_TIME_ZONE,
  extractSupabaseTables,
  formatDateInTimeZone,
  parseFontVariables,
  replaceBetweenMarkers,
  updateLastVerifiedLine,
} from '../src/lib/docs/architectureDocRefresh'

const PROJECT_ROOT = process.cwd()
const DATABASE_DOC_PATH = join(PROJECT_ROOT, 'DATABASE_STRUCTURE.md')
const CSS_DOC_PATH = join(PROJECT_ROOT, 'CSS_ARCHITECTURE.md')
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'supabase', 'migrations')
const LAYOUT_PATH = join(PROJECT_ROOT, 'src', 'app', 'layout.tsx')
const GLOBALS_CSS_PATH = join(PROJECT_ROOT, 'src', 'app', 'globals.css')
const SOURCE_SCAN_DIRS = ['src', 'scripts']

const EXPECTED_ARCHITECTURE_TABLES = [
  'users',
  'venues',
  'availability',
  'bookings',
  'recurring_bookings',
  'slot_templates',
  'slot_instances',
  'slot_modal_content',
  'slot_interactions',
  'pricing_rules',
  'slot_instance_pricing',
  'venue_admin_configs',
  'drop_in_template_sync_queue',
  'regular_template_sync_queue',
  'payments',
  'insurance_documents',
  'subscriptions',
  'messages',
  'audit_logs',
]

function collectFiles(rootDir: string, extensions: string[]): string[] {
  if (!existsSync(rootDir)) {
    return []
  }

  const files: string[] = []
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions))
      continue
    }
    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath)
    }
  }

  return files
}

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function buildDatabaseSnapshot(nowPacific: string): Promise<string> {
  const migrationFiles = existsSync(MIGRATIONS_DIR)
    ? readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort()
    : []

  const sourceFiles = SOURCE_SCAN_DIRS.flatMap((dir) => collectFiles(join(PROJECT_ROOT, dir), ['.ts', '.tsx']))
  const tables = new Set<string>()
  for (const file of sourceFiles) {
    const content = readUtf8(file)
    for (const table of extractSupabaseTables(content)) {
      tables.add(table)
    }
  }
  const appTables = Array.from(tables).sort()

  return getLiveTableSummary(EXPECTED_ARCHITECTURE_TABLES).then((liveSummary) => {
    const latestMigration = migrationFiles.length > 0 ? migrationFiles[migrationFiles.length - 1] : 'none found'
    const tablePreview = appTables.slice(0, 12).map((table) => `\`${table}\``).join(', ')
    const extraCount = appTables.length > 12 ? ` (+${appTables.length - 12} more)` : ''

    return [
      `- Generated at: ${nowPacific} (${PACIFIC_TIME_ZONE})`,
      `- Latest migration in repo: \`${latestMigration}\` (${migrationFiles.length} total)`,
      `- Distinct tables referenced in app code via \`.from()\`: ${appTables.length}`,
      `- App table sample: ${tablePreview || 'none'}${extraCount}`,
      `- Live key-table check: ${liveSummary}`,
    ].join('\n')
  })
}

async function getLiveTableSummary(tables: string[]): Promise<string> {
  dotenv.config({ path: resolve(PROJECT_ROOT, '.env.local') })
  dotenv.config({ path: resolve(PROJECT_ROOT, '.env') })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return 'skipped (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)'
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const checks = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('*').limit(0)
        return { table, exists: !error }
      })
    )

    const missing = checks.filter((check) => !check.exists).map((check) => check.table)
    if (missing.length === 0) {
      return `${tables.length}/${tables.length} tables available`
    }
    return `${tables.length - missing.length}/${tables.length} tables available; missing: ${missing.map((table) => `\`${table}\``).join(', ')}`
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return `failed (${message})`
  }
}

function buildCssSnapshot(nowPacific: string): string {
  const cssFiles = collectFiles(join(PROJECT_ROOT, 'src'), ['.css'])
    .map((file) => relative(PROJECT_ROOT, file))
    .sort()

  const uiComponentFiles = collectFiles(join(PROJECT_ROOT, 'src', 'components', 'ui'), ['.tsx'])
  const sourceFiles = collectFiles(join(PROJECT_ROOT, 'src'), ['.ts', '.tsx'])
  const cvaFiles = sourceFiles.filter((file) => readUtf8(file).includes('cva('))
  const fontVariables = existsSync(LAYOUT_PATH) ? parseFontVariables(readUtf8(LAYOUT_PATH)) : []
  const globals = existsSync(GLOBALS_CSS_PATH) ? readUtf8(GLOBALS_CSS_PATH) : ''
  const hasMapPopupOverrides = globals.includes('.map-popup')
  const hasDarkVariant = globals.includes('@custom-variant dark')

  return [
    `- Generated at: ${nowPacific} (${PACIFIC_TIME_ZONE})`,
    `- CSS files in \`src\`: ${cssFiles.length} (${cssFiles.map((file) => `\`${file}\``).join(', ') || 'none'})`,
    `- UI primitive files in \`src/components/ui\`: ${uiComponentFiles.length}`,
    `- Files using \`cva()\`: ${cvaFiles.length}`,
    `- Font variables from layout: ${fontVariables.map((font) => `\`${font}\``).join(', ') || 'none found'}`,
    `- Globals include dark variant: ${hasDarkVariant ? 'yes' : 'no'}`,
    `- Globals include Mapbox popup overrides: ${hasMapPopupOverrides ? 'yes' : 'no'}`,
  ].join('\n')
}

function refreshDoc(path: string, snapshotStart: string, snapshotEnd: string, snapshot: string, nowPacific: string) {
  const original = readUtf8(path)
  const withDate = updateLastVerifiedLine(original, nowPacific)
  const withSnapshot = replaceBetweenMarkers(withDate, snapshotStart, snapshotEnd, snapshot)
  writeFileSync(path, withSnapshot, 'utf8')
}

async function main() {
  const nowPacific = formatDateInTimeZone(new Date(), PACIFIC_TIME_ZONE)
  const databaseSnapshot = await buildDatabaseSnapshot(nowPacific)
  const cssSnapshot = buildCssSnapshot(nowPacific)

  refreshDoc(DATABASE_DOC_PATH, DATABASE_SNAPSHOT_START, DATABASE_SNAPSHOT_END, databaseSnapshot, nowPacific)
  refreshDoc(CSS_DOC_PATH, CSS_SNAPSHOT_START, CSS_SNAPSHOT_END, cssSnapshot, nowPacific)

  console.log('Updated architecture docs:')
  console.log(`- ${relative(PROJECT_ROOT, DATABASE_DOC_PATH)}`)
  console.log(`- ${relative(PROJECT_ROOT, CSS_DOC_PATH)}`)
}

main().catch((error) => {
  console.error('Failed to refresh architecture docs.')
  if (error instanceof Error) {
    console.error(error.message)
  }
  process.exit(1)
})
