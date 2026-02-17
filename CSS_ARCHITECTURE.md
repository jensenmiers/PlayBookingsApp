# CSS Architecture Documentation

## Overview

Play Bookings uses **Tailwind CSS v4** with a CSS-first configuration approach. This is a significant departure from Tailwind v3's JavaScript-based configuration.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Tailwind CSS v4 | Utility-first CSS; config via `@theme` in `globals.css` |
| PostCSS (`@tailwindcss/postcss` v4) | CSS processing pipeline |
| Radix UI primitives | Dialog, Tabs, Toast, Label, Slot; styled with Tailwind |
| tw-animate-css | Animation utilities |
| class-variance-authority (cva) | Component variant management (Button, Toast, etc.) |
| tailwind-merge + clsx | Class merging via `cn()` in `@/lib/utils` |

## File Structure

```
src/
├── app/
│   └── globals.css          # Main CSS entry point, theme definitions
├── components/
│   └── ui/
│       └── *.tsx            # Radix-based UI components (cva + Tailwind)
├── lib/
│   └── utils.ts             # cn() helper function
└── postcss.config.mjs       # PostCSS configuration
```

There is no `tailwind.config.ts`; Tailwind v4 uses CSS-only configuration.

## Architecture Hierarchy

### 1. CSS Entry Point (`globals.css`)

```css
@import "tailwindcss";        /* Tailwind v4 base */
@import "tw-animate-css";     /* Animation utilities */
```

### 2. Theme Configuration (`@theme inline` block)

Tailwind v4 uses CSS-native configuration via `@theme` blocks (no `tailwind.config.ts` in this project).

```css
@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  /* Maps CSS variables to Tailwind color utilities */
}
```

**Critical**: Only variables defined in `@theme inline` become available as Tailwind utilities.

### 3. CSS Custom Properties (`:root`)

Design tokens are defined in `globals.css` as CSS variables. Each palette has steps 50–900. Semantic tokens (e.g. `--background`, `--foreground`, `--primary`) reference palette variables. See `globals.css` for current OKLCH values.

### 4. Component Variants (cva)

Radix-based UI components use `class-variance-authority` for variant management:

```tsx
const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
      }
    }
  }
)
```

### 5. Class Merging (`cn()` utility)

```tsx
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
```

## Color System

Palettes are Radix-inspired: primary (green/sage to forest), accent (orange), and secondary (warm neutrals). All values live in `globals.css` as OKLCH variables.

### Palettes

| Palette | Description | Usage |
|---------|-------------|-------|
| **Primary** | Radix Green (sage to forest, ~140–152° hue) | CTAs, buttons, brand elements, links, ring |
| **Secondary** | Warm neutrals (~45–75° hue) | Text, backgrounds, borders, surfaces, muted |
| **Accent** | Radix Orange (~32–55° hue) | Badges, highlights, destructive (dark), charts |

### Shade Scale

Each palette has steps 50–900 in `globals.css`:
- 50–200: Light backgrounds, subtle elements
- 300–400: Borders, disabled states
- 500: Base (anchor); semantic `--primary` / `--accent` point here in light mode
- 600–700: Interactive states, hover
- 800–900: Text, dark backgrounds

### Semantic Tokens

Semantic tokens are set in `:root` and overridden in `.dark`. See `globals.css` for full definitions.

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--background` | secondary-50 | secondary-900 | Page background |
| `--foreground` | secondary-900 | near-white | Primary text |
| `--primary` | primary-500 | primary-400 | Brand (green) |
| `--primary-foreground` | secondary-900 | secondary-900 | Text on primary |
| `--secondary` | secondary-500 | secondary-400 | Neutral accent |
| `--accent` | accent-500 | accent-400 | Highlight (orange) |
| `--muted` | secondary-100 | secondary-700 | Subtle backgrounds |
| `--border` | secondary-200 | mixed (dark) | Borders, dividers |

### Accessibility Notes

- Use primary (green) and secondary-700+ on light backgrounds for sufficient contrast.
- Accent (orange) is used for decorative elements and badges; ensure text on accent meets contrast requirements where used.

## Known Issues & Gotchas

### 1. No JavaScript Tailwind Config

This project does not use `tailwind.config.ts`. Tailwind v4 uses CSS-only configuration. All theme values (colors, radius, etc.) are defined in `globals.css` via:
- CSS custom properties in `:root` (and `.dark`)
- Mappings in the `@theme inline` block

### 2. Shade Classes Require Explicit Mapping

To use `bg-secondary-600`, you MUST have:
```css
@theme inline {
  --color-secondary-600: var(--secondary-600);
}
```

Without this mapping, the class compiles but resolves to transparent.

### 3. cva Variants vs Custom Classes

Button (and other cva-based components) apply variant styles that may conflict with passed `className` values. `tailwind-merge` deduplicates by utility type, so a variant class like `text-primary-foreground` might not be overridden by `text-white`. **Workaround**: Use the `!` modifier (e.g. `!text-white`) or inline styles when you need to force an override.

### 4. OKLCH Color Space

Colors use OKLCH for perceptual uniformity. Browser DevTools may show colors as `lab()` values.

## Migration Notes

If migrating from Tailwind v3 (or a project that used `tailwind.config.ts`):
1. Define colors and theme in `globals.css` (`:root` and `@theme inline`)
2. Add all palette steps and semantic tokens to the `@theme inline` block so Tailwind utilities resolve
3. Replace hardcoded hex with CSS variables
4. Verify components resolve colors correctly

## Debugging CSS Issues

1. **Check computed styles**: Use DevTools to see if classes resolve to actual values
2. **Verify `@theme` mappings**: Missing mappings = transparent colors
3. **Check class order**: `tailwind-merge` deduplication may remove intended overrides
4. **Restart dev server**: Tailwind v4 + Turbopack may cache aggressively

