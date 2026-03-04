---
name: design-system
description: Route UI tasks through the repository design-system contract and enforce lint gates before completion.
---

# Design-System Skill

Use this skill whenever a task touches styling, visual composition, or UI component markup.

## Required Context

Read these files first:

1. `docs/design-system/design-rules.md`
2. `docs/design-system/visual-language.md`
3. `docs/design-system/interaction-patterns.md`
4. `docs/design-system/machine-enforcement.md`

## Working Contract

- Do not introduce numeric spacing utilities in scoped files.
- Do not introduce named-color utilities or raw color literals/functions in scoped files.
- If a scoped file imports `react-hook-form`, import/use `@/components/ui/form` wrappers.
- Do not import `@radix-ui/*` outside `src/components/ui/**`.

## Required Verification

Before final handoff on UI/styling changes, run:

- `npm run lint:design-system:staged` (when checking staged changes)
- `npm run lint:design-system` (when validating wider scope)

If lint fails, fix code or add a documented exception marker with a reason.
