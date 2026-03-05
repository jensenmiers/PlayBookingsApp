import { parseUnifiedDiff, filterFindingsToChangedLines } from '../design-system/changed-lines'
import { parseExceptionDirectives, isRuleDisabled } from '../design-system/exceptions'
import { checkSpacingTokenRule } from '../design-system/rules/spacing-token'
import { checkColorTokenRule } from '../design-system/rules/color-token'
import { checkFormWrapperRule } from '../design-system/rules/form-wrapper'
import { isInDesignSystemScope } from '../design-system/scope'
import type { Finding } from '../design-system/types'

function applyRuleWithExceptions(
  findings: Finding[],
  source: string,
  file: string
): Finding[] {
  const directives = parseExceptionDirectives(source, file)
  return findings.filter((finding) => !isRuleDisabled(directives, finding.rule, finding.line))
}

describe('design-system lint rules', () => {
  it('fails on numeric spacing utilities', () => {
    const source = '<div className="mt-3 px-4 gap-2" />'

    const findings = checkSpacingTokenRule(source, 'src/components/search/filter.tsx')

    expect(findings).toHaveLength(3)
    expect(findings.every((finding) => finding.rule === 'spacing-token')).toBe(true)
  })

  it('passes semantic spacing tokens and allowed zero/px values', () => {
    const source =
      '<div className="mt-s px-m gap-xl mb-0 px-px px-3xl py-6xl -mt-xl lg:px-l" />'

    const findings = checkSpacingTokenRule(source, 'src/components/search/filter.tsx')

    expect(findings).toHaveLength(0)
  })

  it('fails on negative numeric spacing utilities', () => {
    const source = '<div className="-mt-6 lg:-mx-10" />'

    const findings = checkSpacingTokenRule(source, 'src/components/search/filter.tsx')

    expect(findings).toHaveLength(2)
    expect(findings.map((finding) => finding.excerpt)).toEqual(['-mt-6', 'lg:-mx-10'])
  })

  it('fails on named color utilities and raw color literals', () => {
    const source = [
      '<div className="bg-amber-50 text-secondary-50" />',
      '<div style={{ color: "#fff" }} />',
      '<div style={{ background: "rgb(0, 0, 0)" }} />',
      '<div style={{ borderColor: "hsl(0 0% 0%)" }} />',
    ].join('\n')

    const findings = checkColorTokenRule(source, 'src/components/search/filter.tsx')

    expect(findings.length).toBeGreaterThanOrEqual(4)
    expect(findings.every((finding) => finding.rule === 'color-token')).toBe(true)
  })

  it('passes semantic and palette token color utilities', () => {
    const source = '<div className="bg-primary-400 text-secondary-50 border-border ring-ring" />'

    const findings = checkColorTokenRule(source, 'src/components/search/filter.tsx')

    expect(findings).toHaveLength(0)
  })

  it('fails when react-hook-form is used without ui/form wrapper', () => {
    const source = [
      "import { useForm } from 'react-hook-form'",
      'export function Example() {',
      '  const form = useForm()',
      '  return <div />',
      '}',
    ].join('\n')

    const findings = checkFormWrapperRule(source, 'src/components/forms/example-form.tsx')

    expect(findings).toHaveLength(1)
    expect(findings[0]?.rule).toBe('form-wrapper')
  })

  it('passes when react-hook-form is paired with ui/form wrapper import', () => {
    const source = [
      "import { useForm } from 'react-hook-form'",
      "import { Form, FormField } from '@/components/ui/form'",
      'export function Example() {',
      '  const form = useForm()',
      '  return <Form {...form}><FormField name="x" render={() => <div />} /></Form>',
      '}',
    ].join('\n')

    const findings = checkFormWrapperRule(source, 'src/components/forms/example-form.tsx')

    expect(findings).toHaveLength(0)
  })

  it('fails on direct @radix-ui imports outside src/components/ui', () => {
    const source = [
      "import * as DialogPrimitive from '@radix-ui/react-dialog'",
      'export function Example() {',
      '  return <div />',
      '}',
    ].join('\n')

    const findings = checkFormWrapperRule(source, 'src/components/search/filter.tsx')

    expect(findings).toHaveLength(1)
    expect(findings[0]?.message).toContain('@radix-ui')
  })

  it('supports line-level exception markers with reasons', () => {
    const source = [
      '// design-lint-disable-next-line spacing-token -- token migration in progress',
      '<div className="mt-3" />',
    ].join('\n')

    const findings = applyRuleWithExceptions(
      checkSpacingTokenRule(source, 'src/components/search/filter.tsx'),
      source,
      'src/components/search/filter.tsx'
    )

    expect(findings).toHaveLength(0)
  })

  it('fails exception markers without reasons', () => {
    const source = [
      '// design-lint-disable-next-line spacing-token',
      '<div className="mt-3" />',
    ].join('\n')

    const directives = parseExceptionDirectives(source, 'src/components/search/filter.tsx')

    expect(directives.findings).toHaveLength(1)
    expect(directives.findings[0]?.rule).toBe('exception-format')
  })
})

describe('changed-lines filtering', () => {
  it('reports only diagnostics on added/modified lines from unified diff', () => {
    const diff = [
      'diff --git a/src/components/search/filter.tsx b/src/components/search/filter.tsx',
      'index 0000000..1111111 100644',
      '--- a/src/components/search/filter.tsx',
      '+++ b/src/components/search/filter.tsx',
      '@@ -2,0 +3,1 @@',
      '+<div className="mt-3" />',
      '@@ -8,0 +10,1 @@',
      '+<div className="bg-amber-50" />',
      '',
    ].join('\n')

    const changedLines = parseUnifiedDiff(diff)

    const findings: Finding[] = [
      {
        rule: 'spacing-token',
        message: 'Spacing token violation',
        file: 'src/components/search/filter.tsx',
        line: 3,
      },
      {
        rule: 'color-token',
        message: 'Color token violation',
        file: 'src/components/search/filter.tsx',
        line: 8,
      },
    ]

    const filtered = filterFindingsToChangedLines(findings, changedLines)

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.line).toBe(3)
  })

  it('maps multiple files for staged and unpushed style diffs', () => {
    const diff = [
      'diff --git a/src/components/search/filter.tsx b/src/components/search/filter.tsx',
      '--- a/src/components/search/filter.tsx',
      '+++ b/src/components/search/filter.tsx',
      '@@ -1,0 +1,2 @@',
      '+line 1',
      '+line 2',
      'diff --git a/src/components/book/slots.tsx b/src/components/book/slots.tsx',
      '--- a/src/components/book/slots.tsx',
      '+++ b/src/components/book/slots.tsx',
      '@@ -20,0 +21,1 @@',
      '+line 21',
      '',
    ].join('\n')

    const changedLines = parseUnifiedDiff(diff)

    expect(changedLines.get('src/components/search/filter.tsx')).toEqual(new Set([1, 2]))
    expect(changedLines.get('src/components/book/slots.tsx')).toEqual(new Set([21]))
  })
})

describe('design-system scope', () => {
  it('includes auth files in scope', () => {
    expect(isInDesignSystemScope('src/app/(auth)/layout.tsx')).toBe(true)
    expect(isInDesignSystemScope('src/app/auth/login/page.tsx')).toBe(true)
    expect(isInDesignSystemScope('src/app/auth/callback/route.ts')).toBe(true)
    expect(isInDesignSystemScope('src/components/auth/auth-modal.tsx')).toBe(true)
  })

  it('keeps dashboard and admin files out of scope', () => {
    expect(isInDesignSystemScope('src/app/(dashboard)/layout.tsx')).toBe(false)
    expect(isInDesignSystemScope('src/components/dashboard/sidebar-navigation.tsx')).toBe(false)
    expect(isInDesignSystemScope('src/components/admin/super-admin-venue-config-page.tsx')).toBe(false)
  })

  it('keeps active venue routes in scope', () => {
    expect(isInDesignSystemScope('src/app/venue/[name]/page.tsx')).toBe(true)
    expect(isInDesignSystemScope('src/app/venue/[name]/not-found.tsx')).toBe(true)
  })
})
