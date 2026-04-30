import { readFileSync } from 'fs'
import { join } from 'path'

describe('venue seed copy', () => {
  it('keeps First Presbyterian Church of Hollywood positioned for basketball-specific activity', () => {
    const seedSource = readFileSync(join(process.cwd(), 'scripts/seed-venues.ts'), 'utf8')

    expect(seedSource).toContain(
      "description: 'Large church campus in Hollywood with gymnasium facilities. Community-focused space available for basketball practices, training sessions, pickup runs, and basketball-specific activities. Historic venue with ample parking.'"
    )
    expect(seedSource).not.toContain('basketball activities and events')
  })
})
