# Visual Language

This document defines token contracts used by design-system lint rules.

## Spacing Tokens

Use these semantic tokens in spacing utilities (`mt-*`, `px-*`, `gap-*`, `space-*`):

- `xxs`: `0.125rem` (2px)
- `xs`: `0.25rem` (4px)
- `s`: `0.5rem` (8px)
- `m`: `0.75rem` (12px)
- `l`: `1rem` (16px)
- `xl`: `1.5rem` (24px)
- `2xl`: `2rem` (32px)
- `3xl`: `2.5rem` (40px)
- `4xl`: `3rem` (48px)
- `5xl`: `4rem` (64px)
- `6xl`: `5rem` (80px)

Allowed special values:

- `0`
- `px`

## Color Contract

Allowed utility families in scoped UI code:

- Semantic: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `accent`, `muted`, `destructive`, `border`, `input`, `ring`
- Palette shades: `primary-*`, `secondary-*`, `accent-*`
- Additional semantic families from globals: `chart-*`, `sidebar-*`

Disallowed in scoped UI code:

- Tailwind named colors (for example `amber`, `green`, `blue`, etc.)
- Raw literals/functions in source (`#hex`, `rgb(...)`, `hsl(...)`)

## Form Wrapper Contract

- If a scoped file imports `react-hook-form`, it must also import from `@/components/ui/form`.
- `@radix-ui/*` imports are restricted to `src/components/ui/**`.

## Migration Examples

- `mt-3` -> `mt-m`
- `px-4` -> `px-l`
- `gap-2` -> `gap-s`
- `bg-amber-50` -> `bg-accent-100` (or a semantic token class)
