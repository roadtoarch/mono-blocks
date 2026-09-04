---
name: SPAT Multi-Tenant Design System
version: "1.0.0"
description: >
  A flexible, per-tenant design system built on Carbon v11 with OKLCH color tokens,
  runtime light/dark mode switching, and curated typography. Supports subdomain-based
  tenant resolution with branded colors, fonts, and content.

colors:
  primary: oklch(0.53 0.2 250)
  primary.50: oklch(0.97 0.04 250)
  primary.100: oklch(0.93 0.07 250)
  primary.200: oklch(0.87 0.12 250)
  primary.300: oklch(0.79 0.15 250)
  primary.400: oklch(0.7 0.18 250)
  primary.500: oklch(0.62 0.2 250)
  primary.600: oklch(0.53 0.2 250)
  primary.700: oklch(0.45 0.18 250)
  primary.800: oklch(0.36 0.14 250)
  primary.900: oklch(0.28 0.1 250)
  primary.950: oklch(0.2 0.06 250)
  neutral.50: oklch(0.985 0.002 260)
  neutral.100: oklch(0.965 0.003 260)
  neutral.200: oklch(0.925 0.005 260)
  neutral.300: oklch(0.875 0.007 260)
  neutral.400: oklch(0.71 0.01 260)
  neutral.500: oklch(0.55 0.012 260)
  neutral.600: oklch(0.45 0.015 260)
  neutral.700: oklch(0.37 0.018 260)
  neutral.800: oklch(0.27 0.02 260)
  neutral.900: oklch(0.21 0.022 260)
  neutral.950: oklch(0.15 0.025 260)
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
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  headingXs:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingSm:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headingMd:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  headingLg:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headingXl:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
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

This design system provides a flexible, per-tenant theming layer on top of IBM Carbon v11. It supports runtime light/dark mode switching, per-tenant brand colors, curated typography, and semantic layout variants (top-nav vs side-nav).

**Core principles:**

1. **Per-tenant flexibility** — Each tenant defines their own primary color, logo, font family, and content without code changes.
2. **Perceptual color consistency** — All tokens use OKLCH for stable hue across lightness levels and predictable contrast.
3. **Carbon v11 integration** — Design tokens map to Carbon's `--cds-*` CSS custom properties at runtime via `applyTheme.ts`.
4. **Light/dark mode** — Automatic via `prefers-color-scheme` or manual toggle. Dark mode reverses the neutral palette mapping.
5. **Accessibility first** — All text/background pairs meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text).

## Colors

### Neutral Palette

The neutral palette provides surfaces, text, and borders. It uses OKLCH with a stable hue of 260° (blue-gray) to avoid the purple shift common in HSL ramps.

**Light mode (default):**

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `oklch(0.985 0.002 260)` | Page background |
| `surface` | `oklch(0.965 0.003 260)` | Cards, panels, sidebar |
| `textPrimary` | `oklch(0.15 0.025 260)` | Body text, headings |
| `textSecondary` | `oklch(0.37 0.018 260)` | Labels, captions |
| `textDisabled` | `oklch(0.71 0.01 260)` | Disabled text |
| `borderSubtle` | `oklch(0.925 0.005 260)` | Card borders, dividers |
| `borderDefault` | `oklch(0.55 0.012 260)` | Input borders (upgraded for WCAG 3:1 UI contrast) |
| `borderStrong` | `oklch(0.55 0.012 260)` | Focus rings, strong borders |

**Dark mode (applied via `[data-theme="dark"]` on `<html>`):**

| Token | Dark Override |
|-------|---------------|
| `background` | `oklch(0.15 0.025 260)` |
| `surface` | `oklch(0.21 0.022 260)` |
| `textPrimary` | `oklch(0.985 0.002 260)` |
| `textSecondary` | `oklch(0.875 0.007 260)` |
| `borderSubtle` | `oklch(0.27 0.02 260)` |
| `borderDefault` | `oklch(0.37 0.018 260)` |

### Primary Palette

The primary palette drives interactive elements. Tenants override the base hue at runtime via `tenants.json`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `oklch(0.53 0.2 250)` | Base primary color (buttons, links) |
| `primary.50` | `oklch(0.97 0.04 250)` | Hover backgrounds, subtle fills |
| `primary.100` | `oklch(0.93 0.07 250)` | Selected row backgrounds |
| `primary.500` | `oklch(0.62 0.2 250)` | Lighter shade for decorative elements |
| `primary.600` | `oklch(0.53 0.2 250)` | Interactive elements (buttons, links) |
| `primary.700` | `oklch(0.45 0.18 250)` | Hover state |
| `primary.800` | `oklch(0.36 0.14 250)` | Active state |

**Tenant override:** When a tenant sets `theme.primary` in `tenants.json`, the `applyTenantTheme()` function remaps `--cds-interactive`, `--cds-button-primary`, `--cds-focus`, and related Carbon tokens to that color. Hover/active shades are computed via `color-mix(in oklch, ...)` at runtime.

### Contrast Requirements

| Context | Minimum | Example |
|---------|---------|---------|
| Body text | 4.5:1 (WCAG AA) | `textPrimary` on `background` ≈ 16.5:1 |
| Large text (≥18px) | 3:1 | `textSecondary` on `background` ≈ 8.5:1 |
| UI components | 3:1 | `textInverse` on `interactive` ≈ 7.5:1 |

**Fixing contrast:** Adjust lightness (L) only. Chroma (C) has negligible effect on contrast.

### Support Colors

Semantic colors for feedback states. Each has a foreground (text/icon) and background (banner/pill) variant:

| Token | Value | Hue | Usage |
|-------|-------|-----|-------|
| `success` | `oklch(0.60 0.17 155)` | Green | Success states, confirmed actions |
| `successBg` | `oklch(0.96 0.04 155)` | Green | Success banner backgrounds |
| `warning` | `oklch(0.75 0.16 80)` | Amber | Warning states, attention needed |
| `warningBg` | `oklch(0.97 0.05 80)` | Amber | Warning banner backgrounds |
| `error` | `oklch(0.58 0.22 25)` | Red | Error states, validation failures |
| `errorBg` | `oklch(0.96 0.03 25)` | Red | Error banner backgrounds |
| `info` | `oklch(0.60 0.15 230)` | Blue | Informational messages, tips |
| `infoBg` | `oklch(0.96 0.03 230)` | Blue | Info banner backgrounds |

Foreground tokens (`success`, `warning`, `error`, `info`) meet WCAG AA contrast (≥4.5:1) against their matching background tokens. Background tokens are intentionally low-chroma to avoid visual noise in inline banners.

### Dark Mode Interactive Brightness

In dark mode, interactive elements use `primary.400` (L=0.70) instead of `primary.600` (L=0.53) for focus rings, links, and hover states. This matches Carbon's g100 pattern of using brighter interactive shades on dark backgrounds for better visibility.

| Token | Light | Dark Override |
|-------|-------|---------------|
| `focus` | `primary.600` | `primary.400` |
| link hover | `primary.700` | `primary.300` |
| interactive hover | `primary.700` | `primary.500` |

### `borderDefault` Mapping Decision

The semantic `borderDefault` maps to `neutral.500` (not `neutral.300`) for input borders. `neutral.300` on `neutral.50` surface yields ~1.4:1 contrast, below WCAG 3:1 for UI components. `neutral.500` provides ~3.2:1, meeting the requirement while remaining visually subtle.

## Typography

### Font Families

Tenants choose from a curated list of Google Fonts, loaded at runtime via `applyTenantTypography()`:

| Name | Character | Tenant Default |
|------|-----------|----------------|
| Inter | Clean, modern sans-serif | ACME Corp |
| Roboto | Neutral, highly legible | — |
| Open Sans | Friendly, humanist | — |
| Lato | Warm, rounded | — |
| Source Sans Pro | Corporate, readable | NorthPac Resources |
| Poppins | Geometric, friendly | — |

Fallback: `system-ui, -apple-system, sans-serif`.

### Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `caption` | 0.75rem (12px) | 1.5 | 400 | 0 | Helper text, timestamps |
| `label` | 0.875rem (14px) | 1.5 | 400 | 0 | Form labels, badges |
| `body` | 1rem (16px) | 1.5 | 400 | 0 | Default body text |
| `headingXs` | 1rem (16px) | 1.3 | 600 | -0.01em | Card titles, section labels |
| `headingSm` | 1.25rem (20px) | 1.3 | 600 | -0.01em | Subsection headings |
| `headingMd` | 1.5rem (24px) | 1.2 | 600 | -0.015em | Page section headings |
| `headingLg` | 2rem (32px) | 1.1 | 600 | -0.02em | Page titles |
| `headingXl` | 2.5rem (40px) | 1.1 | 600 | -0.02em | Hero headings |
| `mono` | 0.875rem (14px) | 1.5 | 400 | 0 | Code blocks, IDs |

**Rules:**
- Heading sizes descend with level — `headingLg` ≥ `headingMd` ≥ `headingSm` on any page.
- Line-heights are unitless — they scale with font size.
- Body text capped around 60–75 characters per line via `max-width: 65ch`.

### Font Loading

Fonts load from Google Fonts CDN via a dynamically injected `<link>` tag:

```html
<link id="tenant-google-font" rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
```

## Layout

### Spacing Scale

A 4px-based spacing scale ensures visual rhythm:

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.1` | 0.25rem (4px) | Icon padding, tight gaps |
| `spacing.2` | 0.5rem (8px) | Form field padding |
| `spacing.3` | 0.75rem (12px) | Button padding |
| `spacing.4` | 1rem (16px) | Standard gaps |
| `spacing.6` | 1.5rem (24px) | Card padding |
| `spacing.8` | 2rem (32px) | Modal padding |
| `spacing.12` | 3rem (48px) | Section breaks |
| `spacing.16` | 4rem (64px) | Hero spacing |

### Layout Variants

Tenants choose between two layout variants in `tenants.json`:

**`top-nav`** (ACME): Horizontal navigation in the header, full-width content. Best for apps with few navigation items.

**`side-nav`** (NorthPac): Vertical sidebar (16rem wide, collapsible) with offset content. Best for dashboard-style layouts with many items.

### Responsive Breakpoints

Carbon v11 standard breakpoints:

| Name | Min Width | Usage |
|------|-----------|-------|
| `sm` | 320px | Mobile (portrait) |
| `md` | 672px | Mobile landscape, small tablets |
| `lg` | 1056px | Tablets, small laptops |
| `xlg` | 1312px | Laptops, desktops |
| `max` | 1584px | Large desktops |

## Elevation & Depth

### Shadows

Use layered transparent `box-shadow` instead of solid borders for depth:

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
| `rounded.sm` | 0.125rem (2px) | Badges, tags |
| `rounded.md` | 0.25rem (4px) | Buttons, inputs |
| `rounded.lg` | 0.5rem (8px) | Cards, panels |
| `rounded.xl` | 0.75rem (12px) | Modals, large containers |
| `rounded.full` | 9999px | Pill buttons, avatars |

## Components

### Button

Primary button using the `interactive` color. Hover and active states derive from the primary palette at 700/800 steps.

```css
background-color: var(--cds-button-primary);
color: var(--cds-text-on-color);
border-radius: 0.25rem;
padding: 0.75rem 1.5rem;
height: 2.5rem;
transition-property: background-color, transform;
transition-duration: 150ms;
```

Press feedback: `transform: scale(0.96)` — exactly 0.96, never below 0.95.

### Card

Surface container with subtle border and layered shadow.

```css
background-color: var(--cds-layer-01);
border-radius: 0.5rem;
padding: 1.5rem;
```

### Header

Full-width header using the interactive color. Logo replaces hardcoded "BCGov" prefix.

```css
background-color: var(--tenant-header-background);
color: var(--tenant-header-text);
height: 3rem;
```

### Input

Standard text input with focus ring using the interactive color.

```css
background-color: var(--cds-field-01);
border-radius: 0.25rem;
padding: 0.5rem 0.75rem;
height: 2.5rem;
```

### Modal

Centered overlay with elevated shadow and large border radius.

```css
background-color: var(--cds-layer-01);
border-radius: 0.75rem;
padding: 2rem;
```

### Sidebar

Fixed-width vertical navigation (16rem) for the `side-nav` layout variant.

```css
background-color: var(--cds-layer-01);
width: 16rem;
padding: 1rem;
```

## Do's and Don'ts

### Do's

✅ **Use OKLCH for all color operations** — Stable hue, predictable contrast, perceptual uniformity.

✅ **Map tokens to Carbon's `--cds-*` properties** — Enables runtime theme switching without Sass recompilation.

✅ **Test contrast in both light and dark mode** — Adjust lightness (L) to fix contrast issues, not chroma (C).

✅ **Use semantic names for type scale** — `body`, `headingMd` makes usage rules clear.

✅ **Apply concentric border radius** — `outerRadius = innerRadius + padding` for nested elements.

✅ **Use layered shadows for depth** — Adapts to any background color, unlike solid borders.

✅ **Use `color-mix()` in OKLCH space for hover/active states** — Maintains hue stability across shades.

✅ **Use `@use`/`@forward` in Sass** — Carbon v11 migrated to Sass Modules.

### Don'ts

❌ **Don't use HSL for color ramps** — Hue drift and brightness inconsistency break perceptual uniformity.

❌ **Don't hard-code hex values in components** — Use semantic tokens so they respond to theme changes.

❌ **Don't animate `width`, `height`, `margin`, or `top/left`** — Forces layout reflow. Animate `transform` and `opacity` only.

❌ **Don't use `transition: all`** — Name exact properties for performance.

❌ **Don't use `!important` for Carbon overrides** — Theme through tokens/custom properties.

❌ **Don't use `@import` in Sass** — Use `@use`/`@forward`.

❌ **Don't use `font-feature-settings: "tnum" 1`** — Use `font-variant-numeric: tabular-nums` instead.

❌ **Don't type copy in UPPERCASE** — Store in natural case, use `text-transform: uppercase` in CSS.

## Per-Tenant Customization

### Tenant Manifest (`tenants.json`)

Each tenant entry defines:

| Field | Type | Description |
|-------|------|-------------|
| `subdomain` | string | URL subdomain (e.g., `acme`) |
| `tenantId` | string | Unique tenant identifier |
| `displayName` | string | Human-readable name |
| `keycloakClientId` | string | OIDC client ID for this tenant |
| `theme.primary` | string (hex) | Primary brand color |
| `theme.primaryText` | string (hex) | Text color on primary background |
| `theme.headerBackground` | string (hex) | Header background (defaults to primary) |
| `theme.headerText` | string (hex) | Header text color |
| `theme.logoUrl` | string | Path to tenant logo SVG |
| `theme.faviconUrl` | string | Path to tenant favicon |
| `typography.fontFamily` | string | Font family (from curated list) |
| `content.welcomeHeading` | string | Welcome page heading |
| `content.welcomeBody` | string | Welcome page body text |
| `content.footerText` | string | Footer copyright text |
| `features.*` | boolean | Feature flags per tenant |
| `layout` | `"top-nav"` \| `"side-nav"` | Layout variant |

### Runtime Application Flow

1. **Resolve** — `resolveTenant()` extracts subdomain from `window.location.hostname` and looks up the tenant in `tenants.json`.
2. **Theme** — `applyTenantTheme()` sets Carbon's `--cds-*` custom properties on `:root` from the tenant's primary color.
3. **Typography** — `applyTenantTypography()` sets `--cds-body-font-family` and `--cds-heading-font-family`, injects Google Fonts `<link>`.
4. **Color mode** — Light/dark mode controlled via `[data-theme="light"]` or `[data-theme="dark"]` on `<html>`, or automatically via `prefers-color-scheme`. The neutral palette mapping reverses in dark mode.

### Light/Dark Mode Implementation

The system supports three color modes:

1. **System preference** — `prefers-color-scheme` media query (default).
2. **Manual toggle** — User preference stored in `localStorage`, applied via `data-theme` attribute.
3. **Tenant override** — (Future) A tenant can force a specific mode.

**Implementation:**

```css
:root, [data-theme="light"] {
  --cds-background: oklch(0.985 0.002 260);
  --cds-text-primary: oklch(0.15 0.025 260);
  --cds-focus: var(--color-primary-600);
  --cds-link-primary: var(--color-primary-600);
}

[data-theme="dark"] {
  --cds-background: oklch(0.15 0.025 260);
  --cds-text-primary: oklch(0.985 0.002 260);
  --cds-focus: var(--color-primary-400);
  --cds-link-primary: var(--color-primary-400);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --cds-background: oklch(0.15 0.025 260);
    --cds-text-primary: oklch(0.985 0.002 260);
    --cds-focus: var(--color-primary-400);
    --cds-link-primary: var(--color-primary-400);
  }
}
```

### Adding a New Tenant

1. Add entry to `tenants.json` with unique `subdomain`, `tenantId`, `keycloakClientId`.
2. Place logo and favicon assets in `frontend/public/tenants/<subdomain>/`.
3. Choose a primary color (hex) that meets WCAG AA contrast against `primaryText`.
4. Optionally specify `typography.fontFamily` from the curated list.
5. Customize `content` and `features` as needed.
6. Choose a `layout` variant.
7. Update Keycloak realm config to add matching client with redirect URIs.
