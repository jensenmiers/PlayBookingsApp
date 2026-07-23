import { readFileSync } from 'fs'
import { join } from 'path'

describe('ungeocoded venues discovery migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260722000100_include_ungeocoded_venues_in_discovery.sql'
    ),
    'utf8'
  )

  it('recreates get_venues_with_next_available without requiring location', () => {
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_venues_with_next_available')
    expect(migrationSource).toContain('WHERE v.is_active = true')
    expect(migrationSource).not.toMatch(/WHERE v\.is_active = true\s+AND v\.location IS NOT NULL/)
  })

  it('keeps radius filtering dependent on geocoded location', () => {
    expect(migrationSource).toContain('v.location IS NOT NULL')
    expect(migrationSource).toContain('ST_DWithin')
  })
})
