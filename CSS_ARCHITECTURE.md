# CSS Architecture Documentation

## Overview

PlayBookings uses **Tailwind CSS v4** with a CSS-first configuration approach. This is a significant departure from Tailwind v3's JavaScript-based configuration.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | v4.x | Utility-first CSS framework |
| PostCSS | via `@tailwindcss/postcss` v4 | CSS processing pipeline |
| tw-animate-css | v1.3.6 | Animation utilities |
| class-variance-authority (cva) | v0.7.1 | Component variant management |
| tailwind-merge | v3.3.1 | Class deduplication |
| clsx | v2.1.1 | Conditional class joining |

## File Structure

```
src/
├── app/
│   └── globals.css          # Main CSS entry point, theme definitions
├── components/
│   └── ui/
│       └── button.tsx       # shadcn/ui components using cva
├── lib/
│   └── utils.ts             # cn() helper function
├── tailwind.config.ts       # LEGACY - NOT USED BY TAILWIND V4
└── postcss.config.mjs       # PostCSS configuration
```

## Architecture Hierarchy

### 1. CSS Entry Point (`globals.css`)

```css
@import "tailwindcss";        /* Tailwind v4 base */
@import "tw-animate-css";     /* Animation utilities */
```

### 2. Theme Configuration (`@theme inline` block)

Tailwind v4 uses CSS-native configuration via `@theme` blocks instead of `tailwind.config.ts`.

```css
@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  /* Maps CSS variables to Tailwind color utilities */
}
```

**Critical**: Only variables defined in `@theme inline` become available as Tailwind utilities.

### 3. CSS Custom Properties (`:root`)

Design tokens defined as CSS variables:

```css
:root {
  /* Palette shades */
  --primary-50: oklch(0.966 0.007 67.744);
  --primary-600: oklch(0.508 0.052 56.590);
  
  /* Semantic tokens */
  --primary: var(--primary-500);
  --primary-foreground: oklch(0.989 0.004 83.593);
}
```

### 4. Component Variants (cva)

shadcn/ui components use `class-variance-authority` for variant management:

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

### Palettes

| Palette | Hue | Usage |
|---------|-----|-------|
| Primary | Brown/Tan | Text, borders, backgrounds |
| Secondary | Green/Teal | CTAs, accents, interactive elements |
| Accent | Orange/Coral | Highlights, warnings |

### Shade Scale

Each palette has 10 shades (50-900):
- 50-200: Light backgrounds, subtle elements
- 300-400: Borders, disabled states
- 500: Base color
- 600-700: Interactive states, hover
- 800-900: Text, dark backgrounds

### Semantic Tokens

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--background` | primary-50 | primary-900 |
| `--foreground` | primary-900 | near-white |
| `--primary` | primary-500 | primary-300 |
| `--primary-foreground` | near-white | primary-900 |

## Known Issues & Gotchas

### 1. `tailwind.config.ts` is IGNORED

Tailwind v4 does NOT read `tailwind.config.ts` by default. All color definitions in that file are unused. Colors must be defined in `globals.css` via:
- CSS custom properties in `:root`
- Mappings in `@theme inline` block

### 2. Shade Classes Require Explicit Mapping

To use `bg-secondary-600`, you MUST have:
```css
@theme inline {
  --color-secondary-600: var(--secondary-600);
}
```

Without this mapping, the class compiles but resolves to transparent.

### 3. cva Variants Override Custom Classes

The Button component's default variant applies `text-primary-foreground`. When you add `text-white` via className, `tailwind-merge` may not properly override it because they're different utility types.

**Workaround**: Use `!text-white` (important modifier) or inline styles.

### 4. OKLCH Color Space

Colors use OKLCH for perceptual uniformity. Browser DevTools may show colors as `lab()` values.

## Migration Notes

If migrating from Tailwind v3:
1. Move color definitions from `tailwind.config.ts` to `globals.css`
2. Add all color shades to `@theme inline` block
3. Update any hardcoded hex values to use CSS variables
4. Test all components for color resolution

## Debugging CSS Issues

1. **Check computed styles**: Use DevTools to see if classes resolve to actual values
2. **Verify `@theme` mappings**: Missing mappings = transparent colors
3. **Check class order**: `tailwind-merge` deduplication may remove intended overrides
4. **Restart dev server**: Tailwind v4 + Turbopack may cache aggressively

