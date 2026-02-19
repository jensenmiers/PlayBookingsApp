# CSS Architecture (Rebuilt From Current Codebase)

Last rebuilt: 2026-02-19

## How this was rebuilt

This document was rebuilt without using the previous `CSS_ARCHITECTURE.md`.

Sources used:

1. `src/app/globals.css`
2. `postcss.config.mjs`
3. `components.json`
4. UI primitives in `src/components/ui/**`
5. App/page/component class usage in `src/app/**` and `src/components/**`
6. Shared helpers in `src/lib/utils.ts`

## Stack

## Core

- Tailwind CSS v4 via `@import "tailwindcss"` in `src/app/globals.css`
- `tw-animate-css` for animation utilities
- PostCSS plugin: `@tailwindcss/postcss` (`postcss.config.mjs`)
- `clsx` + `tailwind-merge` through `cn()` (`src/lib/utils.ts`)
- `class-variance-authority` (`cva`) for variant APIs (notably `Button` and `Toast`)

## Component foundation

- Radix primitives for interaction-heavy components (Dialog, Sheet, Tabs, Toast, etc.)
- shadcn-style component structure configured by `components.json`
- `data-slot` attributes used throughout UI primitives for semantic targeting and composability

## Global Styling Topology

There is a single global stylesheet:

- `src/app/globals.css`

No CSS modules or SCSS files are currently used in `src`.

`globals.css` responsibilities:

1. Import Tailwind and animation utilities.
2. Define theme tokens in `@theme inline`.
3. Define base design tokens as CSS custom properties in `:root`.
4. Apply global base styles in `@layer base`.

## Token System

## Token flow

1. Raw palette tokens are defined in `:root` (`--primary-*`, `--secondary-*`, `--accent-*`, etc.).
2. Semantic tokens are mapped in `:root` (`--background`, `--foreground`, `--card`, `--muted`, `--border`, etc.).
3. `@theme inline` exposes these as Tailwind tokens (`--color-*`, radii, shadows, fonts).
4. Components consume semantic classes (`bg-background`, `text-foreground`, `bg-card`, etc.) and palette classes (`text-primary-400`, `bg-secondary-800`, etc.).

## Current palette direction

- Primary: green scale (`--primary-50` ... `--primary-900`)
- Secondary: warm dark neutrals/browns
- Accent: warm orange scale

## Surface and depth tokens

- Radius token base: `--radius` (1rem)
- Derived radii: `--radius-sm/md/lg/xl`
- Shadows: `--shadow-soft`, `--shadow-glass`

## Dark-mode posture

- Dark custom variant is declared: `@custom-variant dark (&:is(.dark *));`
- Current semantic defaults in `:root` are dark-first.
- No separate light token block is currently defined in `globals.css`.

## Typography System

Fonts are loaded in `src/app/layout.tsx` via `next/font/google`:

- DM Sans (`--font-dm-sans`)
- DM Serif Display (`--font-dm-serif`)
- Geist Mono (`--font-geist-mono`)

Theme mapping (`@theme inline`):

- `--font-sans -> --font-dm-sans`
- `--font-serif -> --font-dm-serif`
- `--font-mono -> --font-geist-mono`

Usage pattern:

- Sans for default UI/body text.
- Serif for hero/headline emphasis (`font-serif`).
- Mono available for code/technical displays.

## Base Layer Rules

In `@layer base`:

- All elements get border/outline defaults: `@apply border-border outline-ring/50`
- `body` gets semantic background/foreground: `@apply bg-background text-foreground`

Result:

- Most visual styling is utility-driven at component level, with only minimal true global rules.

## Component Styling Architecture

## Pattern 1: Utility-first composition

Most components use inline Tailwind classes directly in JSX.

Examples:

- Layout/page shells in `src/app/**`
- Feature components in `src/components/book/**`, `src/components/search/**`, `src/components/venue/**`, etc.

## Pattern 2: Shared primitive layer

`src/components/ui/**` centralizes reusable primitives:

- `button.tsx` with CVA variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and size variants.
- `toast.tsx` with CVA variants (`default`, `success`, `error`).
- Card, Input, Dialog, Sheet, Tabs, Table, Form, Calendar, etc. use consistent tokenized classes.

## Pattern 3: Class conflict-safe composition

All primitives and many feature components use:

- `cn(...classes)` to combine conditionals safely.
- `twMerge` to resolve Tailwind class conflicts.

## Pattern 4: Slot semantics for wrappers

UI primitives use `data-slot` markers (`data-slot="button"`, `data-slot="card"`, etc.) to:

1. Improve semantic clarity for wrappers.
2. Support predictable overrides in composed components.

## Styling Conventions in Practice

## Spacing and shape

- Rounded geometry is consistent (`rounded-xl`, `rounded-2xl`, `rounded-full`).
- Cards/panels commonly use:
  - `bg-secondary-800`
  - `border border-secondary-50/10`
  - `shadow-soft`

## Color usage

- Semantic classes are used heavily (`bg-background`, `text-foreground`, `bg-card`).
- Palette shade classes (`primary-*`, `secondary-*`, `accent-*`) are used for nuanced states and accents.

## State styling

- Hover/focus/disabled states are mostly utility-based.
- Focus rings commonly rely on `ring-*` with semantic tokens.
- Radix state/data selectors are used in interactive components (`data-[state=*]`, `data-[swipe=*]`).

## Motion

- Utility animations (`animate-spin`, `animate-pulse`) are common.
- Toast and other components use enter/exit state classes.
- `tw-animate-css` augments animation utility availability.

## Architecture by Layer

## Layer 1: Global tokens and reset

- `src/app/globals.css`

## Layer 2: Reusable primitives

- `src/components/ui/**`

## Layer 3: Domain components

- `src/components/book/**`
- `src/components/search/**`
- `src/components/venue/**`
- `src/components/dashboard/**`
- `src/components/bookings/**`

## Layer 4: App routes/pages

- `src/app/**`

## Variant-heavy screen designs

There are multiple visual venue experience variants (`src/components/venue/venue-design-*.tsx`):

- `arena`
- `community`
- `editorial`
- `quickplay`
- `scoreboard`

These intentionally experiment with distinct visual treatments and occasionally use direct color utilities beyond strict semantic-token-only styling.

## What is intentionally not present

1. No Tailwind config file (`tailwind.config.*`) in current setup.
2. No CSS Modules under `src`.
3. No SCSS/SASS pipeline.
4. No separate light-theme token map in `globals.css` at this time.

## Maintenance Guidelines

## Preferred

1. Add/adjust tokens in `src/app/globals.css` first when changing global look/feel.
2. Keep reusable variants in UI primitives (`Button`, `Toast`, etc.) instead of scattering one-off class patterns.
3. Use semantic classes for surfaces/text when possible; use palette shades for controlled accents.
4. Continue using `cn()` for class composition to avoid Tailwind conflict bugs.

## Avoid

1. Introducing ad-hoc global styles for component-specific concerns.
2. Hardcoding color values inline when an existing token class can express intent.
3. Duplicating variant logic across multiple feature components when it belongs in `src/components/ui/**`.

## Quick Audit Checklist

When touching styles:

1. Are tokenized semantic classes used where appropriate?
2. Is the change reusable (should it be in a primitive variant)?
3. Does focus/hover/disabled behavior remain accessible and consistent?
4. Are mobile-first utilities still correct (`base` then `sm:` and up)?
