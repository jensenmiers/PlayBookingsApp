import { readFileSync } from 'fs'
import { join } from 'path'

describe('Memorial Park open gym price migration', () => {
  it('sets Memorial Park drop-in and normalized open-gym pricing to $3/person', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260616000100_update_memorial_open_gym_drop_in_price.sql'),
      'utf8'
    )

    expect(migrationSource).toContain("WHERE name = 'Memorial Park'")
    expect(migrationSource).toContain('drop_in_enabled = true')
    expect(migrationSource).toContain('drop_in_price = 3')
    expect(migrationSource).toContain('amount_cents = 300')
    expect(migrationSource).toContain("action_type = 'info_only_open_gym'")
    expect(migrationSource).toContain('refresh_slot_instances_from_templates')
  })
})
