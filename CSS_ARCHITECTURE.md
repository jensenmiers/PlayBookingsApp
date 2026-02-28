# CSS Architecture

This file describes the current styling system at an architectural level.
It is intentionally concise and avoids per-component class inventories.

## Known Gaps

- Last verified: 2026-02-27 (America/Los_Angeles)
- Verification sources:
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/components/ui/**`
  - `components.json` and `postcss.config.mjs`
- Gap: this is code-level verification only; visual QA across all pages was not part of this pass.
- Gap: variant-heavy venue pages may include local stylistic experiments not fully cataloged here.

## Automated Snapshot (Generated)

<!-- AUTO-SNAPSHOT:CSS:START -->
- Generated at: 2026-02-27 (America/Los_Angeles)
- CSS files in `src`: 1 (`src/app/globals.css`)
- UI primitive files in `src/components/ui`: 16
- Files using `cva()`: 2
- Font variables from layout: `--font-dm-sans`, `--font-dm-serif`, `--font-geist-mono`
- Globals include dark variant: yes
- Globals include Mapbox popup overrides: yes
<!-- AUTO-SNAPSHOT:CSS:END -->

## Current Styling Stack

- Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`.
- PostCSS plugin: `@tailwindcss/postcss`.
- Animation utilities via `tw-animate-css`.
- Utility composition helper: `cn()` (`clsx` + `tailwind-merge`) in `src/lib/utils.ts`.
- Variant system: `class-variance-authority` (currently concentrated in `Button` and `Toast` primitives).

## Styling Topology

- Single global stylesheet: `src/app/globals.css`.
- No CSS Modules in `src`.
- No SCSS/SASS pipeline.
- No `tailwind.config.*`; token exposure is handled directly in CSS with `@theme inline`.

## Token Model

The token chain is:

1. Raw palette tokens in `:root` (`--primary-*`, `--secondary-*`, `--accent-*`).
2. Semantic tokens mapped from that palette (`--background`, `--foreground`, `--card`, `--muted`, `--border`, etc.).
3. Tailwind-facing tokens declared in `@theme inline` (`--color-*`, radii, shadows, fonts).
4. Components consume semantic utility classes first, with palette shades for controlled accents.

Current direction:

- Dark-first semantic defaults.
- Green primary palette, warm neutral secondary palette, warm orange accent palette.
- Shared radius and shadow tokens (`--radius*`, `--shadow-soft`, `--shadow-glass`).

## Typography System

Configured in `src/app/layout.tsx` using `next/font/google`:

- DM Sans (`--font-dm-sans`) for default UI/body.
- DM Serif Display (`--font-dm-serif`) for display/headline emphasis.
- Geist Mono (`--font-geist-mono`) for monospaced needs.

These map to theme fonts in `globals.css` (`--font-sans`, `--font-serif`, `--font-mono`).

## Component Styling Layers

1. Global tokens/base rules:
   - `src/app/globals.css`
2. UI primitives:
   - `src/components/ui/**` (buttons, dialogs, sheets, tabs, tables, form primitives, etc.)
3. Domain components:
   - Feature folders under `src/components/**`
4. Route-level composition:
   - `src/app/**`

## Conventions To Preserve

- Prefer semantic classes (`bg-background`, `text-foreground`, `border-border`) before raw palette shades.
- Put reusable variant behavior in primitives, not scattered page-level one-offs.
- Continue using `cn()` for class composition and conflict resolution.
- Keep `data-slot` markers in primitives for predictable composition/overrides.
- Preserve accessible state styles (`hover`, `focus-visible`, `disabled`, and Radix `data-[state=*]` selectors).

## Explicit Global Exceptions

- `globals.css` includes Mapbox popup styles (`.map-popup ...`) as intentional global overrides for third-party markup.
- Keep global CSS narrowly scoped to tokens, resets, and third-party overrides that cannot be localized.

## When To Update This File

Update this document only when one of these changes:

- Token architecture or palette/semantic mapping changes.
- Styling stack changes (Tailwind/PostCSS/animation tooling).
- Primitive-layer conventions change (`cn`, `cva`, `data-slot` usage).
- A new global styling mechanism is introduced (for example CSS Modules or additional global stylesheets).
