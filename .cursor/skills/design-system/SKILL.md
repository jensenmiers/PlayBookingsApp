---
name: design-system
description: Enforce repository design-system contract for UI tasks before completion.
---

# Design-System Skill (Cursor)

Run this for UI/design tasks before implementation.

## Read First

1. `docs/design-system/design-rules.md`
2. `docs/design-system/visual-language.md`
3. `docs/design-system/interaction-patterns.md`
4. `docs/design-system/machine-enforcement.md`

## Contract

- Use semantic spacing tokens, not numeric spacing utilities.
- Use semantic/palette token colors, not named color utilities or raw literals/functions.
- If `react-hook-form` is imported in scoped files, require `@/components/ui/form` wrappers.
- Restrict direct `@radix-ui/*` imports to `src/components/ui/**`.

## Required Checks

- `npm run lint:design-system:staged`
- `npm run lint:design-system` (when doing wider validation)
