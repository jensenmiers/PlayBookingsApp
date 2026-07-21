import { readFileSync } from 'fs'
import { join } from 'path'

describe('venue access capability flags migration', () => {
  const migrationSource = readFileSync(
    join(process.cwd(), 'supabase/migrations/20260721000100_add_venue_access_capability_flags.sql'),
    'utf8'
  )

  it('adds discovery capability columns on venues and backfills from admin config', () => {
    expect(migrationSource).toContain('offers_open_gym')
    expect(migrationSource).toContain('offers_private_rental')
    expect(migrationSource).toContain('drop_in_price')
    expect(migrationSource).toContain('FROM public.venue_admin_configs vac')
    expect(migrationSource).toContain('offers_open_gym = COALESCE(vac.drop_in_enabled, false)')
  })

  it('extends get_venues_with_next_available to return capability columns', () => {
    expect(migrationSource).toContain('offers_open_gym BOOLEAN')
    expect(migrationSource).toContain('offers_private_rental BOOLEAN')
    expect(migrationSource).toContain('v.offers_open_gym')
    expect(migrationSource).toContain('v.offers_private_rental')
    expect(migrationSource).toContain('v.drop_in_price')
  })
})
