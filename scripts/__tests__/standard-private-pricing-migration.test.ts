import { readFileSync } from 'fs'
import { join } from 'path'

describe('standard private pricing migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260728005518_simplify_standard_private_pricing.sql'
    ),
    'utf8'
  )

  it('removes weekend pricing and rejects private pricing rules', () => {
    expect(migrationSource).toContain('DROP COLUMN weekend_rate')
    expect(migrationSource).toContain('pricing_rules_open_gym_only')
    expect(migrationSource).toContain('slot_templates_open_gym_pricing_only')
    expect(migrationSource).toContain(
      "DELETE FROM public.pricing_rules\nWHERE action_type IN ('instant_book', 'request_private')"
    )
  })

  it('returns no instance-pricing override for private discovery candidates', () => {
    const regularCandidates = migrationSource
      .split('regular_candidates AS (')[1]
      .split('info_candidates AS (')[0]

    expect(regularCandidates).toContain('NULL::integer AS price_amount_cents')
    expect(regularCandidates).not.toContain('slot_instance_pricing')
  })

  it('preserves offering-specific pricing for open gym', () => {
    const infoCandidates = migrationSource
      .split('info_candidates AS (')[1]
      .split('all_candidates AS (')[0]

    expect(infoCandidates).toContain("si.action_type = 'info_only_open_gym'")
    expect(infoCandidates).toContain('LEFT JOIN public.slot_instance_pricing')
    expect(infoCandidates).toContain('vac.drop_in_price')
  })
})
