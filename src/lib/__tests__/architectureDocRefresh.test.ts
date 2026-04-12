import {
  DEFAULT_PROJECT_STATE_PATH_SEGMENTS,
  buildLiveTableSummaryResult,
  classifyLiveTableError,
  extractBetweenMarkers,
  extractSupabaseTables,
  hasSubstantiveDocChanges,
  getRetryableLiveTableChecks,
  parseFontVariables,
  preserveSnapshotEntry,
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

  it('classifies missing-table errors separately from verification failures', () => {
    expect(
      classifyLiveTableError({
        code: 'PGRST205',
        message: "Could not find the table 'public.messages' in the schema cache",
      })
    ).toEqual({
      status: 'missing',
      reason: "Could not find the table 'public.messages' in the schema cache",
    })

    expect(
      classifyLiveTableError({
        code: 'PGRST000',
        message: 'FetchError: request failed, reason: getaddrinfo ENOTFOUND',
      })
    ).toEqual({
      status: 'verification_failed',
      reason: 'FetchError: request failed, reason: getaddrinfo ENOTFOUND',
    })
  })

  it('returns only verification failures for retry', () => {
    expect(
      getRetryableLiveTableChecks([
        { table: 'users', status: 'available' },
        { table: 'venues', status: 'missing', reason: 'table does not exist' },
        { table: 'bookings', status: 'verification_failed', reason: 'network timeout' },
      ])
    ).toEqual(['bookings'])
  })

  it('formats missing tables as substantive snapshot changes', () => {
    expect(
      buildLiveTableSummaryResult([
        { table: 'users', status: 'available' },
        { table: 'venues', status: 'missing', reason: 'table does not exist' },
      ])
    ).toEqual({
      snapshotLine: '- Live key-table check: 1/2 tables available; missing: `venues`',
      isVerifiable: true,
      consoleLines: ['Live key-table check: 1/2 tables available; missing: `venues`'],
    })
  })

  it('formats transient verification failures without serializing them as missing', () => {
    expect(
      buildLiveTableSummaryResult([
        { table: 'users', status: 'available' },
        { table: 'venues', status: 'verification_failed', reason: 'network timeout' },
        { table: 'bookings', status: 'verification_failed', reason: 'network timeout' },
      ])
    ).toEqual({
      snapshotLine: '- Live key-table check: verification failed',
      isVerifiable: false,
      consoleLines: [
        'Live key-table check: verification failed',
        'Verification failures: `venues`, `bookings`',
        'Failure reasons: network timeout',
      ],
    })
  })

  it('preserves the previous live key-table check line when verification fails', () => {
    const previousSnapshot = [
      '- Generated at: 2026-04-11 (America/Los_Angeles)',
      '- Live key-table check: 19/19 tables available',
    ].join('\n')

    const nextSnapshot = [
      '- Generated at: 2026-04-12 (America/Los_Angeles)',
      '- Live key-table check: verification failed',
    ].join('\n')

    expect(
      preserveSnapshotEntry(previousSnapshot, nextSnapshot, 'Live key-table check')
    ).toEqual([
      '- Generated at: 2026-04-12 (America/Los_Angeles)',
      '- Live key-table check: 19/19 tables available',
    ].join('\n'))
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
