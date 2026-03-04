export type RuleName = 'spacing-token' | 'color-token' | 'form-wrapper' | 'exception-format'

export interface Finding {
  rule: RuleName
  message: string
  file: string
  line: number
  column?: number
  excerpt?: string
}

export type Mode = 'all' | 'staged' | 'unpushed'
