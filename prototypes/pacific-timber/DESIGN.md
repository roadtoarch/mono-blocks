---
name: Pacific Timber Co Design System
version: "1.0.0"
description: >
  Pacific Timber Co design system — full-service forestry company in British Columbia
  with warm brown branding, side-nav layout, Merriweather/Source Sans 3 typography,
  and OKLCH color tokens.

colors:
  primary: oklch(0.50 0.10 55)
  primary.50: oklch(0.97 0.04 55)
  primary.100: oklch(0.93 0.07 55)
  primary.200: oklch(0.87 0.12 55)
  primary.300: oklch(0.79 0.15 55)
  primary.400: oklch(0.7 0.18 55)
  primary.500: oklch(0.62 0.2 55)
  primary.600: oklch(0.50 0.10 55)
  primary.700: oklch(0.45 0.18 55)
  primary.800: oklch(0.36 0.14 55)
  primary.900: oklch(0.28 0.1 55)
  primary.950: oklch(0.2 0.06 55)
  neutral.50: oklch(0.96 0.01 60)
  neutral.100: oklch(0.93 0.015 55)
  neutral.200: oklch(0.925 0.005 55)
  neutral.300: oklch(0.875 0.007 55)
  neutral.400: oklch(0.71 0.01 55)
  neutral.500: oklch(0.55 0.012 55)
  neutral.600: oklch(0.45 0.015 55)
  neutral.700: oklch(0.37 0.018 55)
  neutral.800: oklch(0.22 0.03 50)
  neutral.900: oklch(0.28 0.03 55)
  neutral.950: oklch(0.15 0.025 55)
  background: "{colors.neutral.50}"
  surface: "{colors.neutral.100}"
  textPrimary: "{colors.neutral.950}"
  textSecondary: "{colors.neutral.700}"
  textDisabled: "{colors.neutral.400}"
  textInverse: "{colors.neutral.50}"
  borderSubtle: "{colors.neutral.200}"
  borderDefault: "{colors.neutral.500}"
  borderStrong: "{colors.neutral.500}"
  interactive: "{colors.primary.600}"
  interactiveHover: "{colors.primary.700}"
  interactiveActive: "{colors.primary.800}"
  focus: "{colors.primary.600}"
  success: oklch(0.60 0.17 155)
  successBg: oklch(0.96 0.04 155)
  warning: oklch(0.75 0.16 80)
  warningBg: oklch(0.97 0.05 80)
  error: oklch(0.58 0.22 25)
  errorBg: oklch(0.96 0.03 25)
  info: oklch(0.60 0.15 230)
  infoBg: oklch(0.96 0.03 230)

typography:
  body:
    fontFamily: "Source Sans 3, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Source Sans 3, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Source Sans 3, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  headingXs:
    fontFamily: "Merriweather, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingSm:
    fontFamily: "Merriweather, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingMd:
    fontFamily: "Merriweather, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headingLg:
    fontFamily: "Merriweather, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headingXl:
    fontFamily: "Merriweather, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5

rounded:
  none: 0
  sm: 0.125rem
  md: 0.25rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px

spacing:
  0: 0
  1: 0.25rem
  2: 0.5rem
  3: 0.75rem
  4: 1rem
  5: 1.25rem
  6: 1.5rem
  8: 2rem
  10: 2.5rem
  12: 3rem
  16: 4rem
  20: 5rem

components:
  Button:
    backgroundColor: "{colors.interactive}"
    textColor: "{colors.textInverse}"
    rounded: "{rounded.md}"
    padding: "{spacing.3} {spacing.6}"
    height: 2.5rem
  Card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.6}"
  Header:
    backgroundColor: "{colors.interactive}"
    textColor: "{colors.textInverse}"
    height: 3rem
  Input:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "{spacing.2} {spacing.3}"
    height: 2.5rem
  Modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.8}"
  Sidebar:
    backgroundColor: "{colors.surface}"
    width: 16rem
    padding: "{spacing.4}"
---

## Overview

Pacific Timber Co is a full-service forestry company in British Columbia. Operations span silviculture (seedling/nursery), logging, hauling, and lumber milling — a complete seed-to-finished-lumber vertical. The warm brown branding evokes craftsmanship, tradition, and sustainable forestry.

**Core principles:**

1. **Craftsmanship** — Design elements convey tradition and quality in timber products.
2. **Warm brown branding** — Earthy brown primary (`oklch(0.50 0.10 55)`) with amber accents.
3. **Side-nav layout** — Vertical sidebar for complex navigation across forestry operations.
4. **Serif headings** — Merriweather for headings evokes tradition; Source Sans 3 for body readability.

## Colors

### Neutral Palette

The neutral palette uses OKLCH with a warm brown tint (~55°) to harmonize with the primary color.

**Light mode (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `oklch(0.96 0.01 60)` | Page background (warm cream) |
| `surface` | `oklch(0.93 0.015 55)` | Cards, panels |
| `textPrimary` | `oklch(0.15 0.025 55)` | Body text, headings |
| `textSecondary` | `oklch(0.37 0.018 55)` | Labels, captions |
| `borderSubtle` | `oklch(0.925 0.005 55)` | Card borders, dividers |
| `borderDefault` | `oklch(0.55 0.012 55)` | Input borders |

**Dark mode:**

| Token | Dark Override |
|-------|---------------|
| `background` | `oklch(0.22 0.03 50)` (dark brown) |
| `surface` | `oklch(0.28 0.03 55)` |
| `textPrimary` | `oklch(0.96 0.01 60)` |

### Primary Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `oklch(0.50 0.10 55)` | Base warm brown |
| `primary.500` | `oklch(0.62 0.2 55)` | Lighter decorative |
| `primary.600` | `oklch(0.50 0.10 55)` | Interactive elements |
| `primary.700` | `oklch(0.45 0.18 55)` | Hover state |
| `primary.800` | `oklch(0.36 0.14 55)` | Active state |

### Support Colors

| Token | Value | Usage |
|-------|-------|-------|
| `success` | `oklch(0.60 0.17 155)` | Confirmed actions |
| `warning` | `oklch(0.75 0.16 80)` | Attention needed |
| `error` | `oklch(0.58 0.22 25)` | Validation failures |
| `info` | `oklch(0.60 0.15 230)` | Informational messages |

## Typography

### Font Families

- **Headings:** Merriweather — Classic serif evoking tradition and craftsmanship
- **Body:** Source Sans 3 — Clean, readable sans-serif for operational text

### Type Scale

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `caption` | Source Sans 3 | 0.75rem | 400 | Timestamps, helper text |
| `label` | Source Sans 3 | 0.875rem | 400 | Form labels, badges |
| `body` | Source Sans 3 | 1rem | 400 | Default body text |
| `headingXs` | Merriweather | 1rem | 700 | Card titles |
| `headingSm` | Merriweather | 1.25rem | 700 | Subsection headings |
| `headingMd` | Merriweather | 1.5rem | 700 | Page sections |
| `headingLg` | Merriweather | 2rem | 700 | Page titles |
| `headingXl` | Merriweather | 2.5rem | 700 | Hero headings |

## Layout

### Side-Nav Variant

Pacific Timber uses a vertical sidebar navigation layout. The sidebar (16rem wide) contains navigation for forestry operations.

```
┌────────┬────────────────────────────────────────┐
│        │  Header (Logo + User Controls)         │
│  Side  ├────────────────────────────────────────┤
│  Nav   │                                        │
│        │        Main Content Area               │
│  16rem │                                        │
│        │                                        │
└────────┴────────────────────────────────────────┘
```

### Navigation Items

- Dashboard
- Silviculture
  - Seedling Inventory
  - Nursery Operations
  - Planting Schedule
- Logging
  - Harvest Blocks
  - Equipment Fleet
  - Safety Reports
- Hauling
  - Truck Dispatch
  - Route Planning
  - Load Tickets
- Milling
  - Lumber Grades
  - Production Output
  - Quality Control
- Inventory
- Billing
- Reports

## Elevation & Depth

**Light mode (3-layer):**
```css
box-shadow:
  0 1px 2px oklch(0 0 0 / 0.05),
  0 2px 4px oklch(0 0 0 / 0.05),
  0 4px 8px oklch(0 0 0 / 0.05);
```

**Dark mode (single-ring):**
```css
box-shadow: 0 0 0 1px oklch(1 0 0 / 0.1);
```

## Shapes

### Border Radius

Concentric border radius: `outerRadius = innerRadius + padding`.

| Token | Value | Usage |
|-------|-------|-------|
| `rounded.sm` | 0.125rem | Badges, tags |
| `rounded.md` | 0.25rem | Buttons, inputs |
| `rounded.lg` | 0.5rem | Cards, panels |
| `rounded.xl` | 0.75rem | Modals |
| `rounded.full` | 9999px | Pill buttons, avatars |

## Components

### Button
Primary button using warm brown `interactive` color. Press feedback: `transform: scale(0.96)`.

### Card
Surface container with layered shadow on warm brown-tinted neutral background.

### Sidebar
Fixed-width vertical navigation (16rem) with brown accent on active items.

## Do's and Don'ts

### Do's
✅ Use OKLCH for all color operations  
✅ Map tokens to CSS custom properties  
✅ Test contrast in both light and dark mode  
✅ Use `scale(0.96)` for press feedback  
✅ Use serif headings for brand character

### Don'ts
❌ Don't use HSL for color ramps  
❌ Don't hard-code hex values in components  
❌ Don't animate `width`, `height`, `margin`  
❌ Don't use `transition: all`  
❌ Don't mix serif/sans-serif without purpose
