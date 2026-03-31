import {
  DEFAULT_PROJECT_STATE_PATH_SEGMENTS,
  extractBetweenMarkers,
  extractSupabaseTables,
  hasSubstantiveDocChanges,
  parseFontVariables,
  resolveArchitectureDocRefreshStatePath,
  replaceBetweenMarkers,
  serializeRefreshState,
  parseRefreshState,
  summarizeSnapshotChanges,
} from '@/lib/docs/architectureDocRefresh'

describe('architecture doc refresh helpers', () => {
  it('replaces content between markers', () => {
    const input = [
      'before',
      '<!-- AUTO:START -->',
      'old',
      '<!-- AUTO:END -->',
      'after',
    ].join('\n')

    const result = replaceBetweenMarkers(input, '<!-- AUTO:START -->', '<!-- AUTO:END -->', 'new')

    expect(result).toContain('<!-- AUTO:START -->\nnew\n<!-- AUTO:END -->')
    expect(result).toContain('before')
    expect(result).toContain('after')
  })

  it('extracts content between markers', () => {
    const input = [
      'before',
      '<!-- AUTO:START -->',
      'inside',
      '<!-- AUTO:END -->',
      'after',
    ].join('\n')

    expect(extractBetweenMarkers(input, '<!-- AUTO:START -->', '<!-- AUTO:END -->')).toBe('inside')
  })

  it('extracts unique table names from Supabase from() calls', () => {
    const source = `
      supabase.from('venues').select('*')
      supabase.from("users").select('*')
      supabase.from('venues').eq('id', 1)
    `

    expect(extractSupabaseTables(source)).toEqual(['users', 'venues'])
  })

  it('parses configured font variable names from layout source', () => {
    const source = `
      const dmSans = DM_Sans({ variable: "--font-dm-sans" })
      const dmSerif = DM_Serif_Display({ variable: '--font-dm-serif' })
    `

    expect(parseFontVariables(source)).toEqual(['--font-dm-sans', '--font-dm-serif'])
  })

  it('ignores generated-at churn when summarizing snapshot changes', () => {
    const previous = [
      '- Generated at: 2026-03-29 (America/Los_Angeles)',
      '- Latest migration in repo: `old.sql` (40 total)',
    ].join('\n')

    const next = [
      '- Generated at: 2026-03-30 (America/Los_Angeles)',
      '- Latest migration in repo: `old.sql` (40 total)',
    ].join('\n')

    expect(summarizeSnapshotChanges(previous, next)).toEqual([])
  })

  it('reports substantive snapshot deltas', () => {
    const previous = [
      '- Generated at: 2026-03-29 (America/Los_Angeles)',
      '- Latest migration in repo: `old.sql` (40 total)',
      '- Distinct tables referenced in app code via `.from()`: 19',
    ].join('\n')

    const next = [
      '- Generated at: 2026-03-30 (America/Los_Angeles)',
      '- Latest migration in repo: `new.sql` (41 total)',
      '- Distinct tables referenced in app code via `.from()`: 20',
    ].join('\n')

    expect(summarizeSnapshotChanges(previous, next)).toEqual([
      {
        label: 'Distinct tables referenced in app code via `.from()`',
        previous: '19',
        next: '20',
      },
      {
        label: 'Latest migration in repo',
        previous: '`old.sql` (40 total)',
        next: '`new.sql` (41 total)',
      },
    ])
  })

  it('treats date-only document updates as non-substantive', () => {
    const previousDoc = [
      '## Known Gaps',
      '- Last verified: 2026-03-29 (America/Los_Angeles)',
      '<!-- AUTO-SNAPSHOT:DB:START -->',
      '- Generated at: 2026-03-29 (America/Los_Angeles)',
      '- Latest migration in repo: `old.sql` (40 total)',
      '<!-- AUTO-SNAPSHOT:DB:END -->',
    ].join('\n')

    const nextDoc = [
      '## Known Gaps',
      '- Last verified: 2026-03-30 (America/Los_Angeles)',
      '<!-- AUTO-SNAPSHOT:DB:START -->',
      '- Generated at: 2026-03-30 (America/Los_Angeles)',
      '- Latest migration in repo: `old.sql` (40 total)',
      '<!-- AUTO-SNAPSHOT:DB:END -->',
    ].join('\n')

    expect(
      hasSubstantiveDocChanges(
        previousDoc,
        nextDoc,
        '<!-- AUTO-SNAPSHOT:DB:START -->',
        '<!-- AUTO-SNAPSHOT:DB:END -->'
      )
    ).toBe(false)
  })

  it('round-trips refresh state payloads', () => {
    const state = {
      lastRunAt: '2026-03-30T23:00:00.000Z',
      lastSuccessfulRunAt: '2026-03-30T23:00:00.000Z',
    }

    expect(parseRefreshState(serializeRefreshState(state))).toEqual(state)
  })

  it('returns null for invalid refresh state payloads', () => {
    expect(parseRefreshState('not json')).toBeNull()
    expect(parseRefreshState('{"lastRunAt":123}')).toBeNull()
  })

  it('prefers explicit architecture state path override', () => {
    const resolved = resolveArchitectureDocRefreshStatePath('/repo', {
      ARCHITECTURE_DOCS_STATE_PATH: '/tmp/custom-state.json',
      CODEX_HOME: '/Users/example/.codex',
    })

    expect(resolved).toBe('/tmp/custom-state.json')
  })

  it('uses CODEX_HOME automation state path when explicit override is absent', () => {
    const resolved = resolveArchitectureDocRefreshStatePath('/repo', {
      CODEX_HOME: '/Users/example/.codex',
    })

    expect(resolved).toBe('/Users/example/.codex/automations/refresh-architecture-docs/last-run.json')
  })

  it('falls back to project-local state path when no env override is provided', () => {
    const resolved = resolveArchitectureDocRefreshStatePath('/repo', {})

    expect(resolved).toBe(`/repo/${DEFAULT_PROJECT_STATE_PATH_SEGMENTS.join('/')}`)
  })
})
