# Machine Enforcement

This file defines authoritative enforcement commands and blocking behavior.

## Authoritative Commands

- Full scope sweep: `npm run lint:design-system`
- Staged-only check (used by pre-commit): `npm run lint:design-system:staged`
- Unpushed diff check (used by pre-push): `npm run lint:design-system:unpushed`

## Gate Behavior

- `pre-commit` hard-fails if staged scoped lines violate any design-system rule.
- `pre-push` hard-fails if unpushed scoped lines violate any design-system rule.
- Both checks operate on changed lines to avoid blocking on legacy untouched code.

## Rule IDs

- `spacing-token`
- `color-token`
- `form-wrapper`
- `exception-format`

## Exception Contract

- Marker format: `design-lint-disable-next-line <rule> -- <reason>`
- Exceptions without a reason fail with `exception-format`.
