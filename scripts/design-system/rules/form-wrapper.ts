import type { Finding } from '../types'

const REACT_HOOK_FORM_IMPORT_PATTERN = /from\s+['"]react-hook-form['"]/g
const UI_FORM_IMPORT_PATTERN = /from\s+['"](?:@\/components\/ui\/form|(?:\.?\.\/)+components\/ui\/form|(?:\.?\.\/)+ui\/form)['"]/g
const RADIX_IMPORT_PATTERN = /from\s+['"]@radix-ui\/[a-z-]+['"]/g

function findFirstLineMatching(source: string, pattern: RegExp): number {
  const lines = source.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    pattern.lastIndex = 0
    if (pattern.test(lines[index])) {
      return index + 1
    }
  }

  return 1
}

export function checkFormWrapperRule(source: string, file: string): Finding[] {
  const findings: Finding[] = []

  REACT_HOOK_FORM_IMPORT_PATTERN.lastIndex = 0
  const usesReactHookForm = REACT_HOOK_FORM_IMPORT_PATTERN.test(source)

  if (usesReactHookForm) {
    UI_FORM_IMPORT_PATTERN.lastIndex = 0
    const hasUiFormImport = UI_FORM_IMPORT_PATTERN.test(source)
    if (!hasUiFormImport) {
      findings.push({
        rule: 'form-wrapper',
        file,
        line: findFirstLineMatching(source, /from\s+['"]react-hook-form['"]/),
        message:
          'Files importing react-hook-form must import and use @/components/ui/form wrappers (Form, FormField, FormItem, FormControl).',
      })
    }
  }

  if (file.startsWith('src/components/ui/')) {
    return findings
  }

  const lines = source.split(/\r?\n/)
  lines.forEach((line, index) => {
    RADIX_IMPORT_PATTERN.lastIndex = 0
    if (!RADIX_IMPORT_PATTERN.test(line)) {
      return
    }

    findings.push({
      rule: 'form-wrapper',
      file,
      line: index + 1,
      excerpt: line.trim(),
      message: 'Do not import @radix-ui primitives directly outside src/components/ui; use shared UI wrappers.',
    })
  })

  return findings
}
