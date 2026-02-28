import { extractSupabaseTables, parseFontVariables, replaceBetweenMarkers } from '@/lib/docs/architectureDocRefresh'

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
})
