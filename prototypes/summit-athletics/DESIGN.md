---
name: Summit Athletics Design System
version: "1.0.0"
description: >
  Summit Athletics design system — fitness gym chain with teal branding,
  hybrid sidebar + top bar layout, Outfit typography, and OKLCH color tokens.

colors:
  primary: oklch(0.50 0.10 178)
  primary.50: oklch(0.97 0.04 178)
  primary.100: oklch(0.93 0.07 178)
  primary.200: oklch(0.87 0.12 178)
  primary.300: oklch(0.79 0.15 178)
  primary.400: oklch(0.7 0.18 178)
  primary.500: oklch(0.62 0.2 178)
  primary.600: oklch(0.50 0.10 178)
  primary.700: oklch(0.45 0.18 178)
  primary.800: oklch(0.36 0.14 178)
  primary.900: oklch(0.28 0.1 178)
  primary.950: oklch(0.2 0.06 178)
  neutral.50: oklch(0.97 0.005 80)
  neutral.100: oklch(0.94 0.01 80)
  neutral.200: oklch(0.925 0.005 80)
  neutral.300: oklch(0.875 0.007 80)
  neutral.400: oklch(0.71 0.01 80)
  neutral.500: oklch(0.55 0.012 80)
  neutral.600: oklch(0.45 0.015 80)
  neutral.700: oklch(0.37 0.018 80)
  neutral.800: oklch(0.20 0.03 180)
  neutral.900: oklch(0.26 0.03 175)
  neutral.950: oklch(0.15 0.025 80)
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
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  headingXs:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingSm:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingMd:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headingLg:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headingXl:
    fontFamily: "Outfit, system-ui, -apple-system, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
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

Summit Athletics is a fitness gym chain with multiple locations. They offer personal training, group classes (Spin, HIIT, Yoga, Strength, Boxing), recovery zones, and nutrition coaching. The teal branding is modern, energetic, and aspirational — conveying strength, community, and peak performance. Tagline: "Your Strength. Our Community."

**Core principles:**

1. **Energy & aspiration** — Design elements convey motivation and peak performance.
2. **Teal branding** — Vibrant teal primary (`oklch(0.50 0.10 178)`) with lighter accents.
3. **Hybrid layout** — Sidebar for primary navigation, top bar for user controls and quick actions.
4. **Outfit typography** — Modern, clean geometric sans-serif for a premium fitness feel.

## Colors

### Neutral Palette

The neutral palette uses OKLCH with a warm tint (~80°) to complement the teal primary.

**Light mode (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `oklch(0.97 0.005 80)` | Page background (warm white) |
| `surface` | `oklch(0.94 0.01 80)` | Cards, panels |
| `textPrimary` | `oklch(0.15 0.025 80)` | Body text, headings |
| `textSecondary` | `oklch(0.37 0.018 80)` | Labels, captions |
| `borderSubtle` | `oklch(0.925 0.005 80)` | Card borders, dividers |
| `borderDefault` | `oklch(0.55 0.012 80)` | Input borders |

**Dark mode:**

| Token | Dark Override |
|-------|---------------|
| `background` | `oklch(0.20 0.03 180)` (dark teal) |
| `surface` | `oklch(0.26 0.03 175)` |
| `textPrimary` | `oklch(0.97 0.005 80)` |

### Primary Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `oklch(0.50 0.10 178)` | Base teal |
| `primary.500` | `oklch(0.62 0.2 178)` | Lighter decorative |
| `primary.600` | `oklch(0.50 0.10 178)` | Interactive elements |
| `primary.700` | `oklch(0.45 0.18 178)` | Hover state |
| `primary.800` | `oklch(0.36 0.14 178)` | Active state |

### Support Colors

| Token | Value | Usage |
|-------|-------|-------|
| `success` | `oklch(0.60 0.17 155)` | Confirmed actions |
| `warning` | `oklch(0.75 0.16 80)` | Attention needed |
| `error` | `oklch(0.58 0.22 25)` | Validation failures |
| `info` | `oklch(0.60 0.15 230)` | Informational messages |

## Typography

### Font Family

**Outfit** — Modern, clean geometric sans-serif for a premium fitness aesthetic.

### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `caption` | 0.75rem | 400 | Timestamps, helper text |
| `label` | 0.875rem | 400 | Form labels, badges |
| `body` | 1rem | 400 | Default body text |
| `headingXs` | 1rem | 600 | Card titles |
| `headingSm` | 1.25rem | 600 | Subsection headings |
| `headingMd` | 1.5rem | 600 | Page sections |
| `headingLg` | 2rem | 600 | Page titles |
| `headingXl` | 2.5rem | 600 | Hero headings |

## Layout

### Hybrid Sidebar + Top Bar

Summit Athletics uses a hybrid layout with a sidebar for primary navigation and a top bar for user controls, notifications, and quick actions.

```
┌────────┬────────────────────────────────────────┐
│        │  Top Bar (Logo, Search, User, Alerts)  │
│  Side  ├────────────────────────────────────────┤
│  Nav   │                                        │
│        │        Main Content Area               │
│  12rem │                                        │
│        │                                        │
└────────┴────────────────────────────────────────┘
```

### Navigation Items

- Dashboard
- Members
  - Membership Plans
  - Member Directory
  - Check-in History
- Classes
  - Schedule
  - Class Types
  - Instructors
- Training
  - Personal Training
  - Group Sessions
  - Progress Tracking
- Recovery
  - Recovery Zones
  - Equipment
- Nutrition
  - Coaching
  - Meal Plans
- Facilities
  - Locations
  - Equipment
  - Maintenance
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
Primary button using teal `interactive` color. Press feedback: `transform: scale(0.96)`.

### Card
Surface container with layered shadow on warm teal-tinted neutral background.

### Sidebar
Collapsible vertical navigation (12rem) with teal accent on active items.

## Do's and Don'ts

### Do's
✅ Use OKLCH for all color operations  
✅ Map tokens to CSS custom properties  
✅ Test contrast in both light and dark mode  
✅ Use `scale(0.96)` for press feedback  
✅ Keep the hybrid layout consistent across pages

### Don'ts
❌ Don't use HSL for color ramps  
❌ Don't hard-code hex values in components  
❌ Don't animate `width`, `height`, `margin`  
❌ Don't use `transition: all`  
❌ Don't overcrowd the sidebar with too many items
