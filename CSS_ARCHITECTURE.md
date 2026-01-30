# CSS Architecture Documentation

## Overview

Play Bookings uses **Tailwind CSS v4** with a CSS-first configuration approach. This is a significant departure from Tailwind v3's JavaScript-based configuration.

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
  /* Primary palette (Gatorade Green) */
  --primary-500: oklch(0.44 0.130 160);  /* #00693F anchor */
  --primary-600: oklch(0.38 0.115 160);
  
  /* Secondary palette (Warm Neutrals) */
  --secondary-50: oklch(0.97 0.010 60);   /* warm cream */
  --secondary-700: oklch(0.35 0.038 45);  /* warm asphalt */
  
  /* Accent palette (Gatorade Orange) */
  --accent-500: oklch(0.65 0.230 33);     /* #fc4c03 anchor */
  
  /* Semantic tokens */
  --background: var(--secondary-50);
  --foreground: var(--secondary-900);
  --primary: var(--primary-500);
  --primary-foreground: var(--secondary-50);
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

The color system is inspired by retro Gatorade branding mixed with traditional basketball aesthetics (leather, gym floors, asphalt).

### Design Philosophy

- **Energy**: Vibrant green and orange convey sports energy
- **Sports Heritage**: Warm neutrals evoke basketball leather and gym floors
- **Familiarity**: Classic sports brand colors create instant recognition

### Palettes

| Palette | Base Color | Hue (OKLCH) | Usage |
|---------|------------|-------------|-------|
| **Primary** | Gatorade Green (#00693F) | ~160° | CTAs, buttons, brand elements, links |
| **Secondary** | Warm Neutrals | ~50-60° | Text, backgrounds, borders, surfaces |
| **Accent** | Gatorade Orange (#fc4c03) | ~33° | Decorative highlights, badges, energy moments |

### Reference Inspirations

- **Primary (Green)**: Classic Gatorade bottle green
- **Secondary (Neutrals)**: Maple gym floors (golden-tan), worn basketball leather (cognac), warm asphalt (charcoal)
- **Accent (Orange)**: Retro Gatorade orange, high-energy "electric" feel

### Shade Scale

Each palette has 10 shades (50-900):
- 50-200: Light backgrounds, subtle elements
- 300-400: Borders, disabled states
- 500: Base color (anchor point)
- 600-700: Interactive states, hover
- 800-900: Text, dark backgrounds

### Semantic Tokens

| Token | Light Mode | Dark Mode | Purpose |
|-------|------------|-----------|---------|
| `--background` | secondary-50 | secondary-900 | Page background (warm cream) |
| `--foreground` | secondary-900 | near-white | Primary text (warm charcoal) |
| `--primary` | primary-500 | primary-400 | Brand color (Gatorade green) |
| `--primary-foreground` | secondary-50 | secondary-900 | Text on green surfaces |
| `--secondary` | secondary-500 | secondary-400 | Neutral accent (cognac) |
| `--accent` | accent-500 | accent-400 | Highlight color (Gatorade orange) |
| `--muted` | secondary-100 | secondary-700 | Subtle backgrounds |
| `--border` | secondary-200 | secondary-800 | Borders and dividers |

### Accessibility Notes

- **Green (#00693F)**: ~5.5:1 contrast on white — passes WCAG AA for all text sizes
- **Orange (#fc4c03)**: ~3.1:1 contrast on white — decorative only, not for text
- **Body text**: Use secondary-700 or darker on secondary-50 for 4.5:1+ contrast

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

