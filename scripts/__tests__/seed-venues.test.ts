import { readFileSync } from 'fs'
import { join } from 'path'

function venueBlock(seedSource: string, venueName: string): string {
  const match = seedSource.match(new RegExp(`\\{\\n    name: '${venueName}',[\\s\\S]*?\\n  \\}`))
  if (!match) throw new Error(`Missing seed venue: ${venueName}`)
  return match[0]
}

describe('venue seed copy', () => {
  it('keeps temporarily hidden venues inactive in fresh seed data', () => {
    const seedSource = readFileSync(join(process.cwd(), 'scripts/seed-venues.ts'), 'utf8')

    expect(venueBlock(seedSource, 'Immaculate Heart')).toContain('is_active: false,')
    expect(venueBlock(seedSource, 'Boys & Girls Club of Hollywood')).toContain('is_active: false,')
  })

  it('includes a migration that deactivates temporarily hidden production venues', () => {
    const migrationSource = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260512000200_deactivate_hidden_venues.sql'),
      'utf8'
    )

    expect(migrationSource).toContain("is_active = false")
    expect(migrationSource).toContain("'Immaculate Heart'")
    expect(migrationSource).toContain("'Boys & Girls Club of Hollywood'")
  })

  it('keeps First Presbyterian Church of Hollywood positioned for basketball-specific activity', () => {
    const seedSource = readFileSync(join(process.cwd(), 'scripts/seed-venues.ts'), 'utf8')

    expect(seedSource).toContain(
      "description: 'Large church campus in Hollywood with gymnasium facilities. Community-focused space available for basketball practices, training sessions, pickup runs, and basketball-specific activities. Historic venue with ample parking.'"
    )
    expect(seedSource).toContain("amenities: ['Indoor Court', 'Parking', 'Bench seating']")
    expect(seedSource).not.toContain('basketball activities and events')
  })
})
