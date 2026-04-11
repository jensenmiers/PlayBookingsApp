# Machine Enforcement

This file defines authoritative enforcement commands and blocking behavior.

## Authoritative Commands

- Full scope sweep: `npm run lint:design-system`
- Staged-only check (used by pre-commit): `npm run lint:design-system:staged`
- Unpushed diff check (used by pre-push): `npm run lint:design-system:unpushed`

## Gate Behavior

- Active enforcement currently covers the marketplace groups plus the super-admin group.
- Dashboard files outside the super-admin group are not blocking yet.
- `pre-commit` hard-fails if staged scoped lines violate any design-system rule.
- `pre-push` hard-fails if unpushed scoped lines violate any design-system rule.
- Both checks operate on changed lines to avoid blocking on legacy untouched code.

## Local Audit Path

- Use `tsx scripts/lint-design-system.ts --mode=<all|staged|unpushed> --scope-group=<group[,group...]>` to audit a specific scope group locally.
- Omitting `--scope-group` uses the active blocking groups.
- Example non-blocking future audit: `tsx scripts/lint-design-system.ts --mode=all --scope-group=dashboard`

## Rule IDs

- `spacing-token`
- `color-token`
- `form-wrapper`
- `exception-format`

## Exception Contract

- Marker format: `design-lint-disable-next-line <rule> -- <reason>`
- Exceptions without a reason fail with `exception-format`.
