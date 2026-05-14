import { readFileSync } from 'fs'
import { join } from 'path'

describe('exact minimum advance policy migration', () => {
  it('updates discovery and booking SQL to use elapsed 24-hour advance days', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260514000100_exact_minimum_advance_policy.sql'),
      'utf8'
    )

    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_regular_available_slot_instances')
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.check_booking_conflicts')
    expect(migrationSource).toContain('COALESCE(vac.min_advance_booking_days, 0) * 24')
    expect(migrationSource).not.toContain('si.date >= (now_pt.ts::date + COALESCE(vac.min_advance_booking_days, 0))')
    expect(migrationSource).not.toContain('NEW.date < (now_pt::date + policy_min_days)')
  })
})
