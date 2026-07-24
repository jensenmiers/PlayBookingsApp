import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('exact minimum advance policy migration', () => {
  it('updates discovery and booking SQL to use elapsed 24-hour advance days', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260514000100_exact_minimum_advance_policy.sql'),
      'utf8'
    )

    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_regular_available_slot_instances')
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.check_booking_conflicts')
    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_venues_with_next_available')
    expect(migrationSource).toContain('FROM public.get_regular_available_slot_instances(')
    expect(migrationSource).toContain('COALESCE(vac.min_advance_booking_days, 0) * 24')
    expect(migrationSource).not.toContain('si.date >= (now_pt.ts::date + COALESCE(vac.min_advance_booking_days, 0))')
    expect(migrationSource).not.toContain('NEW.date < (now_pt::date + policy_min_days)')
  })

  it('adds a forward migration for already-applied projects', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260517000100_fix_next_available_exact_min_advance_rpc.sql'),
      'utf8'
    )

    expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.get_venues_with_next_available')
    expect(migrationSource).toContain('FROM public.get_regular_available_slot_instances(')
    expect(migrationSource).not.toContain('si.date >= (now_pt.ts::date + COALESCE(vac.min_advance_booking_days, 0))')
  })

  it('adds open-gym sessions and chronological ordering to discovery', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260721000100_include_open_gym_in_next_available.sql'),
      'utf8'
    )

    expect(migrationSource).toContain("si.action_type = 'info_only_open_gym'")
    expect(migrationSource).toContain('COALESCE(vac.drop_in_enabled, false) = true')
    expect(migrationSource).toContain('(si.date + si.start_time) >= now_pt.ts')
    expect(migrationSource).toContain('vac.blackout_dates')
    expect(migrationSource).toContain('vac.holiday_dates')
    expect(migrationSource).toContain('external_availability_blocks')
    expect(migrationSource).toContain('next_slot_action_type')
    expect(migrationSource).toContain('next_slot_price_amount_cents')
    expect(migrationSource).toContain('ns.slot_date ASC NULLS LAST')
    expect(migrationSource).toContain('ns.start_time ASC NULLS LAST')
    expect(migrationSource).not.toContain('v.offers_open_gym')
    expect(migrationSource).not.toContain('v.offers_private_rental')
    expect(migrationSource).not.toContain('v.drop_in_price')
    const compatibilityMigrationPath = join(
      process.cwd(),
      'supabase/migrations/20260723000100_include_open_gym_in_next_available.sql'
    )
    expect(existsSync(compatibilityMigrationPath)).toBe(true)

    const compatibilityMigrationSource = readFileSync(compatibilityMigrationPath, 'utf8')
    expect(compatibilityMigrationSource).not.toContain(
      'CREATE OR REPLACE FUNCTION public.get_venues_with_next_available'
    )
    expect(compatibilityMigrationSource).not.toContain('v.offers_open_gym')
    expect(compatibilityMigrationSource).not.toContain('v.offers_private_rental')
    expect(compatibilityMigrationSource).not.toContain('v.drop_in_price')

    const correctiveMigrationSource = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260723000200_fix_next_available_open_gym_discovery.sql'
      ),
      'utf8'
    )
    expect(correctiveMigrationSource).toContain(
      'CREATE OR REPLACE FUNCTION public.get_venues_with_next_available'
    )
    expect(correctiveMigrationSource).toContain('ns.slot_date ASC NULLS LAST')
    expect(correctiveMigrationSource).toContain('ns.start_time ASC NULLS LAST')
    expect(correctiveMigrationSource).not.toContain('v.offers_open_gym')
    expect(correctiveMigrationSource).not.toContain('v.offers_private_rental')
    expect(correctiveMigrationSource).not.toContain('v.drop_in_price')
  })

  it('validates discovery against combined regular and open-gym availability', () => {
    const validatorSource = readFileSync(
      join(process.cwd(), 'scripts/validate-next-available-parity.ts'),
      'utf8'
    )

    expect(validatorSource).toContain('new AvailabilityService')
    expect(validatorSource).toContain("slot.action_type !== 'info_only_open_gym'")
    expect(validatorSource).toContain('zonedDateTimeToDate')
    expect(validatorSource).toContain('next_slot_action_type')
    expect(validatorSource).toContain('next_slot_date')
    expect(validatorSource).toContain('resolveParityComparisonDateTo')
    expect(validatorSource).toContain('action_type_mismatch')
    expect(validatorSource).not.toContain('addDaysToDateString(today, 365)')
    expect(validatorSource).not.toContain('slot.start_time >= nowTime')
  })
})
