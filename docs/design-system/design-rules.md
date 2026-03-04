# Design Rules

These rules are contractually enforced for scoped UI files.

## Scope (Phase 1)

- `src/app/{search,book,booking,venue,venues}/**/*.{ts,tsx}`
- `src/components/{search,book,booking,bookings,forms,venue,venues,maps}/**/*.{ts,tsx}`
- Excluded: `**/*.test.*`, `**/__tests__/**`, generated/output artifacts.

## Required

- Use semantic spacing tokens (`xxs`, `xs`, `s`, `m`, `l`, `xl`, `2xl`) for spacing utilities.
- Use semantic or palette token colors (for example `bg-primary-400`, `text-secondary-50`, `border-border`).
- If `react-hook-form` is imported, shared form wrappers from `@/components/ui/form` must also be imported and used.
- Use shared UI wrappers; do not import `@radix-ui/*` directly outside `src/components/ui/**`.

## Never

- Never use numeric spacing utilities such as `mt-3`, `px-4`, `gap-2` (zero is allowed).
- Never use Tailwind named color utilities such as `bg-amber-50`, `text-green-500`.
- Never use raw color literals/functions in scoped code (`#fff`, `rgb(...)`, `hsl(...)`).

## Exceptions

- Allowed only with a single-line marker and reason:
  - `design-lint-disable-next-line <rule> -- <reason>`
- Supported rules: `spacing-token`, `color-token`, `form-wrapper`.
- Missing reason or unknown rule is a blocking violation.
- Exceptions are temporary debt and should be removed when possible.
